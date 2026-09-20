output "bucket_id" {
  description = "Nome do bucket."
  value       = aws_s3_bucket.fotos.id
}

output "bucket_arn" {
  description = "ARN do bucket."
  value       = aws_s3_bucket.fotos.arn
}

output "bucket_regional_domain_name" {
  description = "Endpoint regional, usado pelo CMS para assinar os uploads."
  value       = aws_s3_bucket.fotos.bucket_regional_domain_name
}
