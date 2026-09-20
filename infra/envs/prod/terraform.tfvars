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
# enquanto ela não sobe. Vire para true depois do primeiro apply.
servir_imagens = false

# Solução Dynamic Image Transformation for CloudFront, arquitetura Lambda.
# Versão fixada: v8.1.1 (10/09/2026). Nomes dos parâmetros conferidos neste
# template — todos terminam em "Parameter".
image_solution_template_url = "https://solutions-reference.s3.amazonaws.com/dynamic-image-transformation-for-amazon-cloudfront/v8.1.1/dynamic-image-transformation-for-amazon-cloudfront-lambda.template"

github_repo   = "TiagoAlmeidaS/isabel-rodrigues"
github_branch = "main"

# OAuth App do GitHub (Settings > Developer settings > OAuth Apps).
# Callback: https://isabelrodrigues.com.br/oauth/redirect
oauth_client_id               = "[CLIENT ID DO OAUTH APP]"
oauth_client_secret_parameter = "/isabel/prod/oauth-client-secret"
