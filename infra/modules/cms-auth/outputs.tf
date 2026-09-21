output "function_url" {
  description = "URL direta do HTTP API. Em produção o acesso é pelo domínio do site."
  value       = aws_apigatewayv2_stage.padrao.invoke_url
}

output "origin_domain" {
  description = "Host do HTTP API, para virar origem no CloudFront."
  value       = replace(replace(aws_apigatewayv2_api.auth.api_endpoint, "https://", ""), "/", "")
}
