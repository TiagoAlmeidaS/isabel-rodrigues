variable "name_prefix" {
  description = "Prefixo de nomes, normalmente projeto-ambiente."
  type        = string
}

variable "bucket_name" {
  description = "Bucket que guarda o build do site."
  type        = string
}

variable "domain_name" {
  description = "Domínio principal do site."
  type        = string
}

variable "subject_alternative_names" {
  description = "Domínios adicionais no certificado e na distribuição (ex.: www)."
  type        = list(string)
  default     = []
}

variable "hosted_zone_id" {
  description = "Zona do Route 53 onde os registros são criados."
  type        = string
}

variable "price_class" {
  description = "Classe de preço do CloudFront. 200 cobre América do Sul sem pagar por todas as bordas."
  type        = string
  default     = "PriceClass_200"
}

variable "imagens_origin_url" {
  description = "URL da distribuição criada pela stack de imagem. Vazio = o site sobe sem o caminho /fit-in/*."
  type        = string
  default     = ""
}
