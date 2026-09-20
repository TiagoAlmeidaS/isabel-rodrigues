variable "bucket_name" {
  description = "Nome do bucket dos originais. Global na AWS, então inclua o ambiente."
  type        = string
}

variable "cms_origins" {
  description = "Origens que podem enviar fotos pelo navegador (o domínio onde o /admin roda)."
  type        = list(string)
}

variable "noncurrent_version_days" {
  description = "Por quantos dias uma versão sobrescrita continua recuperável."
  type        = number
  default     = 90
}
