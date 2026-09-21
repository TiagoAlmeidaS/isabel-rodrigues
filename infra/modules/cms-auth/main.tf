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

# Exposição por HTTP API, e não por Function URL.
#
# A Function URL seria mais simples — menos recursos, sem estágio, sem
# integração. Mas esta conta AWS recusa toda Function URL pública: uma
# função nova, mínima, com authorization_type = "NONE" e a resource policy
# correta, responde 403 antes de invocar o código, sem gerar log. O 403 não
# vem daqui, e não há o que corrigir no Terraform para contorná-lo.
#
# O HTTP API entrega o mesmo payload format 2.0 que a Function URL: o
# handler continua lendo rawPath, queryStringParameters e cookies, e
# devolvendo o array cookies. Nada muda em src/index.mjs.
#
# Público de propósito: é um endpoint de login, chamado pelo navegador antes
# de existir qualquer credencial. A proteção é o state/CSRF, a conferência
# de origem e a lista de domínios — não a rede.
resource "aws_apigatewayv2_api" "auth" {
  name          = var.function_name
  protocol_type = "HTTP"
  description   = "Intermediario OAuth do painel"
}

resource "aws_apigatewayv2_integration" "auth" {
  api_id           = aws_apigatewayv2_api.auth.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.auth.invoke_arn

  # 2.0 é o que dá rawPath e cookies, como a Function URL dava.
  payload_format_version = "2.0"
}

# Rota coringa: quem decide o caminho é o handler, que já trata
# /oauth/authorize, /oauth/redirect e os apelidos /auth e /callback.
resource "aws_apigatewayv2_route" "padrao" {
  api_id    = aws_apigatewayv2_api.auth.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.auth.id}"
}

# Estágio $default: o caminho não ganha prefixo de estágio, então a origem
# do CloudFront aponta para a raiz do domínio do API.
resource "aws_apigatewayv2_stage" "padrao" {
  api_id      = aws_apigatewayv2_api.auth.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_lambda_permission" "api" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.auth.execution_arn}/*/*"
}
