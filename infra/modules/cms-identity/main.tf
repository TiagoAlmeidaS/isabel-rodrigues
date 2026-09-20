# Credencial que a Isabel cola no painel para poder enviar fotos.
#
# ATENÇÃO: o Sveltia assina no navegador, então a Secret Access Key vive na
# máquina dela. Por isso este usuário: (1) não tem acesso ao console,
# (2) só enxerga este bucket, (3) não faz mais nada na conta.
#
# A chave só é criada pelo Terraform se create_access_key = true — e nesse
# caso o segredo FICA NO STATE. Por padrão é false: crie a chave no console
# e entregue a ela por um gerenciador de senhas, sem passar pelo state.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

resource "aws_iam_user" "cms" {
  name = var.user_name
  path = "/cms/"
}

data "aws_iam_policy_document" "cms" {
  statement {
    sid       = "ListarApenasEsteBucket"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [var.bucket_arn]
  }

  statement {
    sid    = "GerenciarObjetosDesteBucket"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${var.bucket_arn}/*"]
  }
}

resource "aws_iam_user_policy" "cms" {
  name   = "acesso-fotos"
  user   = aws_iam_user.cms.name
  policy = data.aws_iam_policy_document.cms.json
}

resource "aws_iam_access_key" "cms" {
  count = var.create_access_key ? 1 : 0
  user  = aws_iam_user.cms.name
}
