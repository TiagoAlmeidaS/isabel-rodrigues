output "stack_outputs" {
  description = "Outputs da stack — entre eles o domínio CloudFront que serve as imagens."
  value       = aws_cloudformation_stack.imagens.outputs
}
