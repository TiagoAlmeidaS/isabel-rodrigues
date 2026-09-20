variable "role_name" {
  description = "Nome do papel assumido pelo GitHub Actions."
  type        = string
}

variable "site_bucket_arn" {
  description = "ARN do bucket do site."
  type        = string
}

variable "distribution_arn" {
  description = "ARN da distribuição CloudFront do site."
  type        = string
}

variable "subjects_permitidos" {
  description = "Subjects OIDC que podem assumir o papel, ex.: repo:dono/repo:ref:refs/heads/main."
  type        = list(string)
}

variable "criar_provider_oidc" {
  description = "false se a conta já tem o provider do GitHub configurado."
  type        = bool
  default     = true
}

variable "provider_oidc_arn" {
  description = "ARN do provider existente, quando criar_provider_oidc = false."
  type        = string
  default     = ""
}

variable "thumbprints" {
  description = "Thumbprints do provider OIDC do GitHub."
  type        = list(string)
  default     = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}
