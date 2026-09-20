# A zona nasce aqui. Os nameservers que ela devolve precisam ser colados no
# Registro.br — até isso acontecer, a validação do certificado fica esperando.
resource "aws_route53_zone" "principal" {
  count = var.criar_zona ? 1 : 0
  name  = var.domain_name

  comment = "Gerenciada pelo Terraform — ${var.project}/${var.environment}"
}

locals {
  name_prefix = "${var.project}-${var.environment}"
  zone_id     = var.criar_zona ? aws_route53_zone.principal[0].zone_id : var.hosted_zone_id

  # O GitHub emite o claim "sub" no formato imutável quando o repositório tem
  # use_immutable_subject ligado — hoje o padrão:
  #
  #   repo:LOGIN@IDDONO/NOME@IDREPO:ref:refs/heads/BRANCH
  #
  # O formato antigo (repo:LOGIN/NOME) não bate, e o AssumeRoleWithWebIdentity
  # falha com AccessDenied. Os ids saem de:
  #   gh api repos/<repo> --jq '{repo: .id, dono: .owner.id}'
  github_subject = var.github_repo_subject != "" ? var.github_repo_subject : var.github_repo

  # O /admin roda no próprio site, então é dali que vêm os uploads.
  cms_origins = concat(
    ["https://${var.domain_name}"],
    [for d in var.subject_alternative_names : "https://${d}"],
    var.extra_cms_origins,
  )
}

module "fotos" {
  source = "../../modules/photo-storage"

  bucket_name = "${local.name_prefix}-fotos"
  cms_origins = local.cms_origins
}

module "cms" {
  source = "../../modules/cms-identity"

  user_name  = "${local.name_prefix}-cms"
  bucket_arn = module.fotos.bucket_arn

  # false: a chave é criada no console e entregue por gerenciador de senhas,
  # para o segredo não ficar no state. Veja o README.
  create_access_key = var.create_cms_access_key
}

data "aws_ssm_parameter" "oauth_client_secret" {
  name = var.oauth_client_secret_parameter
  # Sem with_decryption: só queremos o ARN. O valor é lido pela Lambda,
  # em tempo de execução, para não passar pelo state.
  with_decryption = false
}

module "cms_auth" {
  source = "../../modules/cms-auth"

  function_name = "${local.name_prefix}-cms-auth"
  region        = var.region
  client_id     = var.oauth_client_id

  client_secret_parameter_name = var.oauth_client_secret_parameter
  client_secret_parameter_arn  = data.aws_ssm_parameter.oauth_client_secret.arn

  allowed_domains = concat([var.domain_name], var.subject_alternative_names)
}

module "site" {
  source = "../../modules/site-hosting"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  name_prefix               = local.name_prefix
  bucket_name               = "${local.name_prefix}-site"
  domain_name               = var.domain_name
  subject_alternative_names = var.subject_alternative_names
  hosted_zone_id            = local.zone_id

  # A URL só é lida quando servir_imagens = true — no primeiro apply ela ainda
  # é desconhecida, porque a stack de imagem sobe neste mesmo apply.
  servir_imagens     = var.servir_imagens
  imagens_origin_url = lookup(module.imagens.stack_outputs, var.imagens_output_key, "")
  auth_origin_domain = module.cms_auth.origin_domain
}

module "imagens" {
  source = "../../modules/image-delivery"

  stack_name   = "${local.name_prefix}-imagens"
  template_url = var.image_solution_template_url

  # Nomes conferidos no template publicado da v8.1.1 (todos terminam em
  # "Parameter" — o CDK não sobrescreve o logical id).
  parameters = merge(
    {
      SourceBucketsParameter        = module.fotos.bucket_id
      CorsEnabledParameter          = "Yes"
      CorsOriginParameter           = "https://${var.domain_name}"
      DeployDemoUIParameter         = "No"
      AutoWebPParameter             = "No"
      CloudFrontPriceClassParameter = "PriceClass_200"
      LogRetentionPeriodParameter   = "30"
    },
    var.image_solution_extra_parameters,
  )

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}

module "ci" {
  source = "../../modules/ci-identity"

  role_name        = "${local.name_prefix}-deploy"
  site_bucket_arn  = module.site.bucket_arn
  distribution_arn = module.site.distribution_arn

  subjects_permitidos = [
    "repo:${local.github_subject}:ref:refs/heads/${var.github_branch}",
  ]

  criar_provider_oidc = var.criar_provider_oidc
  provider_oidc_arn   = var.provider_oidc_arn
}
