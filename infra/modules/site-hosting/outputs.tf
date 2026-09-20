output "bucket_id" {
  description = "Bucket do site — destino do aws s3 sync no CI."
  value       = aws_s3_bucket.site.id
}

output "distribution_id" {
  description = "Distribuição CloudFront — usada para invalidar cache no deploy."
  value       = aws_cloudfront_distribution.site.id
}

output "distribution_domain_name" {
  description = "Domínio da distribuição."
  value       = aws_cloudfront_distribution.site.domain_name
}

output "bucket_arn" {
  description = "ARN do bucket do site."
  value       = aws_s3_bucket.site.arn
}

output "distribution_arn" {
  description = "ARN da distribuição."
  value       = aws_cloudfront_distribution.site.arn
}
