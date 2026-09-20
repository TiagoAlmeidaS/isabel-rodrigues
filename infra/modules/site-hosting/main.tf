# Hospedagem do site estático: S3 privado atrás do CloudFront via OAC.
# O build do Astro é sincronizado pro bucket pelo CI.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      version               = "~> 5.70"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

locals {
  s3_origin_id      = "s3-${var.bucket_name}"
  imagens_origin_id = "imagens-${var.bucket_name}"

  # A stack de imagem devolve uma URL com esquema; a origem quer só o host.
  imagens_origin_domain = replace(replace(var.imagens_origin_url, "https://", ""), "/", "")

  # Sem a URL da stack, o comportamento simplesmente não é criado: o site
  # sobe do mesmo jeito e as fotos entram no apply seguinte.
  serve_imagens = var.imagens_origin_url != ""

  auth_origin_id = "auth-${var.bucket_name}"
  serve_auth     = var.auth_origin_domain != ""
}

resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Certificado precisa estar em us-east-1 para o CloudFront aceitar.
resource "aws_acm_certificate" "site" {
  provider                  = aws.us_east_1
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "validacao" {
  for_each = {
    for dvo in aws_acm_certificate.site.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for r in aws_route53_record.validacao : r.fqdn]
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "oac-${var.bucket_name}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_function" "rewrite" {
  name    = "rewrite-${var.name_prefix}"
  runtime = "cloudfront-js-2.0"
  comment = "URLs limpas para o site estático"
  publish = true
  code    = file("${path.module}/rewrite.js")
}

resource "aws_cloudfront_function" "normaliza_accept" {
  name    = "accept-${var.name_prefix}"
  runtime = "cloudfront-js-2.0"
  comment = "Normaliza o Accept em avif/webp/jpeg antes do cache"
  publish = true
  code    = file("${path.module}/normaliza-accept.js")
}

# As fotos entram no mesmo domínio do site, por /fit-in/*. Evita um segundo
# certificado, um segundo domínio e o preconnect extra — e dispensa alias na
# distribuição criada pela stack de imagem, que não controlamos.
resource "aws_cloudfront_cache_policy" "imagens" {
  count = local.serve_imagens ? 1 : 0

  name        = "imagens-${var.name_prefix}"
  min_ttl     = 0
  default_ttl = 31536000
  max_ttl     = 31536000

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = false
    enable_accept_encoding_brotli = false

    headers_config {
      header_behavior = "whitelist"
      headers {
        # Já normalizado pela function acima: no máximo três valores.
        items = ["Accept"]
      }
    }

    cookies_config {
      cookie_behavior = "none"
    }

    query_strings_config {
      query_string_behavior = "none"
    }
  }
}

# O login do painel entra pelo mesmo domínio: nada aqui pode ser cacheado, e
# o cookie de CSRF precisa chegar inteiro na função.
resource "aws_cloudfront_cache_policy" "sem_cache" {
  count = local.serve_auth ? 1 : 0

  name        = "sem-cache-${var.name_prefix}"
  min_ttl     = 0
  default_ttl = 0
  max_ttl     = 0

  parameters_in_cache_key_and_forwarded_to_origin {
    enable_accept_encoding_gzip   = false
    enable_accept_encoding_brotli = false
    headers_config { header_behavior = "none" }
    cookies_config { cookie_behavior = "none" }
    query_strings_config { query_string_behavior = "none" }
  }
}

resource "aws_cloudfront_origin_request_policy" "auth" {
  count = local.serve_auth ? 1 : 0

  name = "auth-${var.name_prefix}"

  # Host de propósito fora: a URL de função rejeita um Host que não seja o
  # dela. Nada mais do visitante é necessário.
  headers_config { header_behavior = "none" }
  cookies_config { cookie_behavior = "all" }
  query_strings_config { query_string_behavior = "all" }
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = var.name_prefix
  aliases             = concat([var.domain_name], var.subject_alternative_names)
  price_class         = var.price_class

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  dynamic "origin" {
    for_each = local.serve_imagens ? [1] : []

    content {
      domain_name = local.imagens_origin_domain
      origin_id   = local.imagens_origin_id

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  dynamic "origin" {
    for_each = local.serve_auth ? [1] : []

    content {
      domain_name = var.auth_origin_domain
      origin_id   = local.auth_origin_id

      custom_origin_config {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.serve_auth ? [1] : []

    content {
      path_pattern           = "/oauth/*"
      target_origin_id       = local.auth_origin_id
      viewer_protocol_policy = "https-only"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true

      cache_policy_id          = aws_cloudfront_cache_policy.sem_cache[0].id
      origin_request_policy_id = aws_cloudfront_origin_request_policy.auth[0].id
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.serve_imagens ? [1] : []

    content {
      path_pattern           = "/fit-in/*"
      target_origin_id       = local.imagens_origin_id
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      compress               = false # AVIF/WebP/JPEG já vêm comprimidos

      cache_policy_id = aws_cloudfront_cache_policy.imagens[0].id

      function_association {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.normaliza_accept.arn
      }
    }
  }

  default_cache_behavior {
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # CachingOptimized, gerenciada pela AWS.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  # O Astro gera 404.html na raiz mesmo com build.format = "directory".
  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 300
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate_validation.site.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

# Só o CloudFront desta distribuição lê o bucket.
data "aws_iam_policy_document" "site" {
  statement {
    sid       = "PermitirApenasEstaDistribuicao"
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = data.aws_iam_policy_document.site.json
}

resource "aws_route53_record" "site" {
  for_each = toset(concat([var.domain_name], var.subject_alternative_names))

  zone_id = var.hosted_zone_id
  name    = each.value
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}
