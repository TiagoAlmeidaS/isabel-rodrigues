# Production.
# Os [COLCHETES] são o que falta decidir antes do primeiro apply.

project     = "isabel"
environment = "prod"
region      = "sa-east-1"

domain_name               = "[DOMINIO]"
subject_alternative_names = ["www.[DOMINIO]"]
hosted_zone_id            = "[ID DA ZONA NO ROUTE 53]"

# Endereço do dev local, para o painel funcionar antes do site existir.
extra_cms_origins = ["http://localhost:4321"]

# Chave do CMS criada no console, fora do state.
create_cms_access_key = false

# FIXE a versão. Confira a URL da release na página da solução antes do apply.
image_solution_template_url = "[URL DO TEMPLATE, VERSAO FIXA]"
