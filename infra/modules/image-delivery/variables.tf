variable "stack_name" {
  description = "Nome da stack CloudFormation da solução de imagem."
  type        = string
}

variable "template_url" {
  description = "URL do template da solução, FIXADA numa versão. Nunca 'latest': upgrade é decisão, não acidente."
  type        = string
}

variable "parameters" {
  description = "Parâmetros do template. Os nomes dependem da versão fixada em template_url — confira antes do primeiro apply."
  type        = map(string)
}

variable "tags" {
  description = "Tags aplicadas à stack."
  type        = map(string)
  default     = {}
}
