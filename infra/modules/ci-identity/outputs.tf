output "role_arn" {
  description = "Coloque este ARN no secret AWS_DEPLOY_ROLE do repositório."
  value       = aws_iam_role.deploy.arn
}
