locals {
  name_prefix = "${var.project}-${var.environment}"

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
  hosted_zone_id            = var.hosted_zone_id
}

module "imagens" {
  source = "../../modules/image-delivery"

  stack_name   = "${local.name_prefix}-imagens"
  template_url = var.image_solution_template_url

  # CONFIRA os nomes destes parâmetros contra a versão fixada acima antes do
  # primeiro apply — eles mudam entre releases da solução.
  parameters = merge(
    {
      SourceBuckets = module.fotos.bucket_id
      CorsEnabled   = "Yes"
      CorsOrigin    = "https://${var.domain_name}"
    },
    var.image_solution_extra_parameters,
  )

  tags = {
    Project     = var.project
    Environment = var.environment
  }
}
