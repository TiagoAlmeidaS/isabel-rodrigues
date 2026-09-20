output "bucket_fotos" {
  description = "Bucket dos originais — configure este nome no Sveltia."
  value       = module.fotos.bucket_id
}

output "bucket_site" {
  description = "Destino do aws s3 sync no deploy."
  value       = module.site.bucket_id
}

output "distribution_id" {
  description = "Distribuição do site — usada para invalidar cache no deploy."
  value       = module.site.distribution_id
}

output "imagens_stack_outputs" {
  description = "Outputs da stack de imagem, incluindo o domínio que serve as fotos."
  value       = module.imagens.stack_outputs
}

output "cms_user" {
  description = "Usuário IAM do painel."
  value       = module.cms.user_name
}

output "cms_access_key_id" {
  description = "Access Key ID, se o Terraform a criou."
  value       = module.cms.access_key_id
}

output "deploy_role_arn" {
  description = "Vai no secret AWS_DEPLOY_ROLE do repositório."
  value       = module.ci.role_arn
}

output "nameservers" {
  description = "Cole estes servidores no Registro.br. Sem isso o domínio não resolve e o certificado não valida."
  value       = var.criar_zona ? aws_route53_zone.principal[0].name_servers : []
}
