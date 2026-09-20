variable "user_name" {
  description = "Nome do usuário IAM usado pelo painel."
  type        = string
}

variable "bucket_arn" {
  description = "ARN do bucket de fotos ao qual este usuário tem acesso."
  type        = string
}

variable "create_access_key" {
  description = "Se true, o Terraform cria a chave — e o segredo fica no state. Prefira false e crie no console."
  type        = bool
  default     = false
}
