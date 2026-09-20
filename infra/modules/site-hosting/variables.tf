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
  description = "URL da distribuição criada pela stack de imagem. Só é lida quando servir_imagens = true."
  type        = string
  default     = ""
}

variable "servir_imagens" {
  description = <<-TEXTO
    Liga o caminho /fit-in/* na distribuição.

    Precisa ser uma flag explícita, e não algo derivado de imagens_origin_url:
    a stack de imagem é criada no mesmo apply, então a URL dela é DESCONHECIDA
    no momento do plano — e count/for_each não aceitam valor desconhecido.

    Primeiro apply com false; depois que a stack existir e a URL estiver no
    state, vire para true e aplique de novo.
  TEXTO
  type        = bool
  default     = false
}

variable "auth_origin_domain" {
  description = "Host da Lambda de autenticação do painel. Obrigatório: o /oauth/* é sempre criado."
  type        = string
}
