# Papel que o GitHub Actions assume para publicar o site.
# OIDC: sem chave de acesso guardada em secret, sem rotação para esquecer.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
  }
}

# Um provider OIDC por conta. Se já existir, importe em vez de recriar:
#   terraform import module.ci.aws_iam_openid_connect_provider.github <arn>
resource "aws_iam_openid_connect_provider" "github" {
  count = var.criar_provider_oidc ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = var.thumbprints
}

locals {
  provider_arn = var.criar_provider_oidc ? aws_iam_openid_connect_provider.github[0].arn : var.provider_oidc_arn
}

data "aws_iam_policy_document" "confianca" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    # Só este repositório, e só nestas refs. Sem isso, qualquer repo do
    # GitHub poderia assumir o papel.
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = var.subjects_permitidos
    }
  }
}

resource "aws_iam_role" "deploy" {
  name               = var.role_name
  assume_role_policy = data.aws_iam_policy_document.confianca.json
}

data "aws_iam_policy_document" "deploy" {
  statement {
    sid       = "SincronizarBuild"
    effect    = "Allow"
    actions   = ["s3:ListBucket"]
    resources = [var.site_bucket_arn]
  }

  statement {
    sid    = "EscreverObjetosDoSite"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:GetObject",
    ]
    resources = ["${var.site_bucket_arn}/*"]
  }

  statement {
    sid       = "InvalidarCache"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"]
    resources = [var.distribution_arn]
  }
}

resource "aws_iam_role_policy" "deploy" {
  name   = "publicar-site"
  role   = aws_iam_role.deploy.id
  policy = data.aws_iam_policy_document.deploy.json
}
