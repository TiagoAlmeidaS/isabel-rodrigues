# Roda UMA vez, antes de tudo, com state local: cria o bucket onde o state dos
# ambientes vai morar. Depois disso ninguém mexe aqui.
#
#   cd infra/bootstrap && terraform init && terraform apply
#
# O state deste módulo (terraform.tfstate local) não guarda segredo nenhum,
# mas guarde-o mesmo assim — é o que permite destruir isso um dia.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "isabel-rodrigues"
      ManagedBy = "terraform"
      Scope     = "bootstrap"
    }
  }
}

variable "region" {
  description = "Região do bucket de state."
  type        = string
  default     = "sa-east-1"
}

variable "state_bucket_name" {
  description = "Nome do bucket de state. Global na AWS."
  type        = string
  default     = "isabel-rodrigues-tfstate"
}

resource "aws_s3_bucket" "state" {
  bucket = var.state_bucket_name

  # State é a memória da infra: apagar por acidente é pior que qualquer bug.
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "state_bucket" {
  description = "Use este nome no backend.tf de cada ambiente."
  value       = aws_s3_bucket.state.id
}
