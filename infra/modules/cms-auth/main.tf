# Intermediário OAuth do painel, em Lambda.
#
# Poderia ser o Worker oficial do Sveltia no Cloudflare. Ficou aqui para não
# trazer um segundo provedor, uma segunda conta e um segundo lugar de deploy
# por causa de uma função de cem linhas — e assim o auth mora no mesmo
# domínio, no mesmo Terraform e no mesmo repositório do resto.

terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.6"
    }
  }
}

data "archive_file" "codigo" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/.build/cms-auth.zip"
}

data "aws_iam_policy_document" "confianca" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "auth" {
  name               = var.function_name
  assume_role_policy = data.aws_iam_policy_document.confianca.json
}

resource "aws_iam_role_policy_attachment" "logs" {
  role       = aws_iam_role.auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "segredo" {
  statement {
    sid       = "LerSegredoDoOAuth"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = [var.client_secret_parameter_arn]
  }

  statement {
    sid       = "DecifrarParametro"
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = ["*"]

    condition {
      test     = "StringEquals"
      variable = "kms:ViaService"
      values   = ["ssm.${var.region}.amazonaws.com"]
    }
  }
}

resource "aws_iam_role_policy" "segredo" {
  name   = "ler-segredo-oauth"
  role   = aws_iam_role.auth.id
  policy = data.aws_iam_policy_document.segredo.json
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = 30
}

resource "aws_lambda_function" "auth" {
  function_name = var.function_name
  role          = aws_iam_role.auth.arn
  handler       = "index.handler"
  runtime       = "nodejs22.x"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 256

  filename         = data.archive_file.codigo.output_path
  source_code_hash = data.archive_file.codigo.output_base64sha256

  environment {
    variables = {
      # O client_id não é segredo: sozinho não troca código por token.
      CLIENT_ID = var.client_id
      # O client_secret fica no Parameter Store, lido em tempo de execução.
      PARAM_CLIENT_SECRET = var.client_secret_parameter_name
      ALLOWED_DOMAINS     = join(",", var.allowed_domains)
      SCOPE               = var.scope
    }
  }

  depends_on = [aws_cloudwatch_log_group.auth]
}

resource "aws_lambda_function_url" "auth" {
  function_name = aws_lambda_function.auth.function_name

  # Pública de propósito: é um endpoint de login, chamado pelo navegador
  # antes de existir qualquer credencial. A proteção é o state/CSRF, a
  # conferência de origem e a lista de domínios — não a rede.
  authorization_type = "NONE"
}
