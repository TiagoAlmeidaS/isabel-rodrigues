output "user_name" {
  description = "Usuário IAM do painel."
  value       = aws_iam_user.cms.name
}

output "access_key_id" {
  description = "Access Key ID, quando criada pelo Terraform."
  value       = var.create_access_key ? aws_iam_access_key.cms[0].id : null
}

output "secret_access_key" {
  description = "Secret Access Key, quando criada pelo Terraform. Fica no state — veja o comentário do módulo."
  value       = var.create_access_key ? aws_iam_access_key.cms[0].secret : null
  sensitive   = true
}
