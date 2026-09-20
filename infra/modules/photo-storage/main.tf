# Bucket dos originais. Só a Isabel escreve (via CMS) e só a Lambda de
# transformação lê. O público nunca toca aqui.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

resource "aws_s3_bucket" "fotos" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_ownership_controls" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "fotos" {
  bucket                  = aws_s3_bucket.fotos.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versionamento: se ela sobrescrever uma foto por engano, a anterior volta.
resource "aws_s3_bucket_versioning" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "fotos" {
  bucket = aws_s3_bucket.fotos.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# O Sveltia assina com SigV4 no navegador, o que dispara preflight.
# Sem este CORS o upload falha silenciosamente.
resource "aws_s3_bucket_cors_configuration" "fotos" {
  bucket = aws_s3_bucket.fotos.id

  cors_rule {
    allowed_methods = ["GET", "PUT", "DELETE", "HEAD"]
    allowed_origins = var.cms_origins
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "fotos" {
  bucket = aws_s3_bucket.fotos.id

  # Upload interrompido no meio não vira cobrança eterna.
  rule {
    id     = "abortar-uploads-incompletos"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  # Versões antigas servem de "desfazer", não de arquivo morto.
  rule {
    id     = "expirar-versoes-antigas"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = var.noncurrent_version_days
    }
  }
}
