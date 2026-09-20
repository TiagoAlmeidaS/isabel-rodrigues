# Production.

project     = "isabel"
environment = "prod"
region      = "sa-east-1"

domain_name               = "isabelrodrigues.com.br"
subject_alternative_names = ["www.isabelrodrigues.com.br"]

# A zona é criada por este Terraform; os nameservers saem no output.
criar_zona     = true
hosted_zone_id = ""

# Endereço do dev local, para o painel funcionar antes do site existir.
extra_cms_origins = ["http://localhost:4321"]

# Chave do CMS criada no console, fora do state.
create_cms_access_key = false

# /fit-in/* entra no segundo apply: a URL da stack de imagem não existe
# enquanto ela não sobe. A stack subiu (ApiEndpoint no state), entao ligado.
servir_imagens = true

# Solução Dynamic Image Transformation for CloudFront, arquitetura Lambda.
# Versão fixada: v8.1.1 (10/09/2026). Nomes dos parâmetros conferidos neste
# template — todos terminam em "Parameter".
image_solution_template_url = "https://solutions-reference.s3.amazonaws.com/dynamic-image-transformation-for-amazon-cloudfront/v8.1.1/dynamic-image-transformation-for-amazon-cloudfront-lambda.template"

github_repo   = "TiagoAlmeidaS/isabel-rodrigues"
github_branch = "main"

# Formato imutavel do claim "sub" (use_immutable_subject). Confirmado no
# CloudTrail: e isto que o GitHub envia ao assumir a role.
github_repo_subject = "TiagoAlmeidaS@60373493/isabel-rodrigues@1377788462"

# A conta já tem o provider OIDC do GitHub, criado por outro projeto. É um
# por conta, e ele é compartilhado: não criamos nem importamos aqui, para
# este state não poder destruir algo de que os outros dependem.
criar_provider_oidc = false
provider_oidc_arn   = "arn:aws:iam::698516610485:oidc-provider/token.actions.githubusercontent.com"

# OAuth App do GitHub (Settings > Developer settings > OAuth Apps).
# Callback: https://isabelrodrigues.com.br/oauth/redirect
oauth_client_id               = "Ov23liuvzAQ6nBKt8rNf"
oauth_client_secret_parameter = "/isabel/prod/oauth-client-secret"
