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

variable "hosted_zone_id" {
  description = "Zona do Route 53 do domínio."
  type        = string
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
