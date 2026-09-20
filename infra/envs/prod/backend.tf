terraform {
  required_version = ">= 1.10"

  backend "s3" {
    bucket = "isabel-rodrigues-tfstate"
    key    = "prod/terraform.tfstate"
    region = "sa-east-1"

    encrypt = true

    # Trava nativa do S3 (Terraform 1.10+). Dispensa a tabela DynamoDB que
    # a documentação antiga pede.
    use_lockfile = true
  }
}
