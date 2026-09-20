output "function_url" {
  description = "URL direta da função. Em produção o acesso é pelo domínio do site."
  value       = aws_lambda_function_url.auth.function_url
}

output "origin_domain" {
  description = "Host da função, para virar origem no CloudFront."
  value       = replace(replace(aws_lambda_function_url.auth.function_url, "https://", ""), "/", "")
}
