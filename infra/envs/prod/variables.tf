variable "project" {
  description = "Nome do projeto, usado em nomes e tags."
  type        = string
  default     = "isabel"
}

variable "environment" {
  description = "Ambiente. Este diretório é prod; stg é uma cópia deste com outro tfvars."
  type        = string
  default     = "prod"
}

variable "region" {
  description = "Região principal."
  type        = string
  default     = "sa-east-1"
}

variable "domain_name" {
  description = "Domínio do site."
  type        = string
}

variable "subject_alternative_names" {
  description = "Domínios adicionais (ex.: www)."
  type        = list(string)
  default     = []
}

variable "criar_zona" {
  description = "true cria a zona no Route 53. false usa uma existente via hosted_zone_id."
  type        = bool
  default     = true
}

variable "hosted_zone_id" {
  description = "Zona existente, quando criar_zona = false."
  type        = string
  default     = ""
}

variable "imagens_output_key" {
  description = "Nome do output da stack de imagem que traz a URL da distribuição. CONFIRA contra a versão fixada do template."
  type        = string
  default     = "ApiEndpoint"
}

variable "extra_cms_origins" {
  description = "Origens extras no CORS do bucket de fotos — normalmente http://localhost:4321 em dev."
  type        = list(string)
  default     = []
}

variable "create_cms_access_key" {
  description = "Se true, o Terraform cria a chave do CMS e o segredo fica no state."
  type        = bool
  default     = false
}

variable "image_solution_template_url" {
  description = "Template da solução de imagem da AWS, numa versão fixa."
  type        = string
}

variable "image_solution_extra_parameters" {
  description = "Parâmetros adicionais do template."
  type        = map(string)
  default     = {}
}

variable "github_repo" {
  description = "Repositório que publica o site, no formato dono/repo."
  type        = string
}

variable "github_branch" {
  description = "Branch que dispara o deploy."
  type        = string
  default     = "main"
}

variable "criar_provider_oidc" {
  description = "false se a conta já tem o provider OIDC do GitHub."
  type        = bool
  default     = true
}

variable "provider_oidc_arn" {
  description = "ARN do provider OIDC existente, quando criar_provider_oidc = false."
  type        = string
  default     = ""
}

variable "oauth_client_id" {
  description = "Client ID do OAuth App do GitHub usado pelo painel."
  type        = string
}

variable "oauth_client_secret_parameter" {
  description = "Nome do parâmetro SecureString com o client secret. Crie no console; o Terraform só lê o ARN."
  type        = string
  default     = "/isabel/prod/oauth-client-secret"
}
