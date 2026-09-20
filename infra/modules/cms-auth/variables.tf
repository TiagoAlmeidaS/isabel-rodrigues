variable "function_name" {
  description = "Nome da função."
  type        = string
}

variable "region" {
  description = "Região, usada na condição kms:ViaService."
  type        = string
}

variable "client_id" {
  description = "Client ID do OAuth App do GitHub. Não é segredo."
  type        = string
}

variable "client_secret_parameter_name" {
  description = "Nome do parâmetro SecureString com o client secret. Criado FORA do Terraform, para não entrar no state."
  type        = string
}

variable "client_secret_parameter_arn" {
  description = "ARN do mesmo parâmetro."
  type        = string
}

variable "allowed_domains" {
  description = "Domínios que podem usar este intermediário. Aceita *.exemplo.com.br."
  type        = list(string)
}

variable "scope" {
  description = "Escopo pedido ao GitHub."
  type        = string
  default     = "repo,user"
}
