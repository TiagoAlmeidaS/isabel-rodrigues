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

# FIXE a versão. Confira a URL da release na página da solução antes do apply.
image_solution_template_url = "[URL DO TEMPLATE, VERSAO FIXA]"

github_repo   = "TiagoAlmeidaS/isabel-rodrigues"
github_branch = "main"
