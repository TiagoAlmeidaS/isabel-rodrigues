# Transformação de imagem: a solução oficial da AWS (Dynamic Image
# Transformation for CloudFront), arquitetura Lambda.
#
# Por que CloudFormation dentro do Terraform: essa solução é distribuída como
# template CFN e a AWS mantém a Lambda (sharp, formatos, patches). Escrever a
# nossa daria mais controle e mais manutenção — layer de sharp em arm64, build
# em CI, atualização de segurança por nossa conta. Para um site de fotógrafa,
# não paga. O Terraform continua dono do ciclo de vida da stack.
#
# Os NOMES DOS PARÂMETROS mudam entre versões do template. Confira os nomes na
# versão fixada em template_url antes do primeiro apply — por isso `parameters`
# é um mapa aberto, definido no ambiente, e não campos fixos aqui.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

resource "aws_cloudformation_stack" "imagens" {
  name         = var.stack_name
  template_url = var.template_url
  parameters   = var.parameters
  tags         = var.tags

  capabilities = [
    "CAPABILITY_IAM",
    "CAPABILITY_NAMED_IAM",
    "CAPABILITY_AUTO_EXPAND",
  ]

  # A stack demora por causa da distribuição CloudFront.
  timeouts {
    create = "60m"
    update = "60m"
    delete = "60m"
  }
}
