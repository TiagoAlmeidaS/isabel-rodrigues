#!/usr/bin/env bash
#
# Sobe o ambiente de produção na ordem certa, parando onde depende de você.
#
#   ./infra/subir-prod.sh
#
# Pode rodar quantas vezes quiser: cada etapa confere o que já existe antes
# de fazer qualquer coisa. Nenhum apply acontece sem você ler o plano.

set -euo pipefail

AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD="$AQUI/envs/prod"
REGIAO="${AWS_REGION:-sa-east-1}"
DOMINIO="isabelrodrigues.com.br"
PARAMETRO_SEGREDO="/isabel/prod/oauth-client-secret"

titulo() { printf '\n\033[1m== %s\033[0m\n' "$1"; }
ok()     { printf '  \033[32m✓\033[0m %s\n' "$1"; }
aviso()  { printf '  \033[33m!\033[0m %s\n' "$1"; }
parar()  { printf '\n\033[31m✗ %s\033[0m\n\n' "$1"; exit 1; }

confirmar() {
  local resposta
  read -r -p "  $1 [s/N] " resposta
  [[ "$resposta" =~ ^[sS]$ ]]
}

# ---------------------------------------------------------------- 0. checagens
titulo "Ferramentas e identidade"

command -v terraform >/dev/null || parar "terraform não encontrado no PATH."
command -v aws >/dev/null       || parar "aws cli não encontrada no PATH."
ok "terraform $(terraform version -json | sed -n 's/.*"terraform_version": *"\([^"]*\)".*/\1/p' | head -1)"

IDENTIDADE="$(aws sts get-caller-identity --output text --query 'Arn' 2>/dev/null)" \
  || parar "Credenciais da AWS inválidas ou ausentes. Configure antes de seguir."
CONTA="$(aws sts get-caller-identity --output text --query 'Account')"
ok "conta $CONTA"
ok "$IDENTIDADE"
echo
confirmar "É nesta conta que o ambiente da Isabel deve ser criado?" \
  || parar "Nada foi feito. Troque o perfil (AWS_PROFILE) e rode de novo."

# ------------------------------------------------------------------ 1. state
titulo "1. Bucket de state"

BUCKET_STATE="isabel-rodrigues-tfstate"
if aws s3api head-bucket --bucket "$BUCKET_STATE" >/dev/null 2>&1; then
  ok "$BUCKET_STATE já existe"
else
  aviso "$BUCKET_STATE não existe — criando com o bootstrap"
  terraform -chdir="$AQUI/bootstrap" init -input=false
  terraform -chdir="$AQUI/bootstrap" apply
  ok "state criado"
fi

# ------------------------------------------------------------------ 2. init
titulo "2. Inicializando produção"
terraform -chdir="$PROD" init -input=false
ok "providers e backend prontos"

# -------------------------------------------------------------- 3. zona / DNS
titulo "3. Zona do Route 53 e delegação"

if ! terraform -chdir="$PROD" state list 2>/dev/null | grep -q '^aws_route53_zone.principal'; then
  aviso "a zona ainda não existe — criando só ela"
  terraform -chdir="$PROD" apply -target=aws_route53_zone.principal
fi

NS_ESPERADOS="$(terraform -chdir="$PROD" output -json nameservers \
  | tr -d '[]"' | tr ',' '\n' | sed 's/^ *//;s/ *$//' | grep -v '^$' | sort)"

echo
echo "  Servidores desta zona:"
echo "$NS_ESPERADOS" | sed 's/^/    /'
echo

NS_ATUAIS="$(dig +short NS "$DOMINIO" 2>/dev/null | sed 's/\.$//' | sort || true)"
if [[ -z "$NS_ATUAIS" ]]; then
  aviso "não consegui consultar o DNS agora"
else
  echo "  Servidores publicados hoje:"
  echo "$NS_ATUAIS" | sed 's/^/    /'
  echo
fi

DELEGADO=0
if [[ -n "$NS_ATUAIS" ]]; then
  PRIMEIRO="$(echo "$NS_ESPERADOS" | head -1)"
  echo "$NS_ATUAIS" | grep -qi "$PRIMEIRO" && DELEGADO=1
fi

if [[ "$DELEGADO" -eq 0 ]]; then
  aviso "o domínio ainda NÃO aponta para esta zona"
  echo
  echo "  No Registro.br, troque os servidores DNS do domínio pelos de cima"
  echo "  (substituindo os atuais, não somando). Depois espere propagar e"
  echo "  rode este script de novo."
  echo
  echo "  Sem isso, o certificado ACM fica esperando e o apply trava."
  exit 0
fi
ok "delegação confirmada"

# ------------------------------------------------------------ 4. segredos
titulo "4. OAuth App do painel"

if aws ssm get-parameter --name "$PARAMETRO_SEGREDO" --region "$REGIAO" >/dev/null 2>&1; then
  ok "client secret já está no Parameter Store"
else
  aviso "falta o client secret em $PARAMETRO_SEGREDO"
  echo
  echo "  1. Crie um OAuth App em github.com/settings/developers"
  echo "     Callback: https://$DOMINIO/oauth/redirect"
  echo "  2. Guarde o secret:"
  echo
  echo "     aws ssm put-parameter --name $PARAMETRO_SEGREDO \\"
  echo "       --type SecureString --value '<secret>' --region $REGIAO"
  echo
  echo "  3. Ponha o client id em envs/prod/terraform.tfvars"
  exit 0
fi

if grep -q '\[CLIENT ID DO OAUTH APP\]' "$PROD/terraform.tfvars"; then
  parar "oauth_client_id ainda está com o placeholder em envs/prod/terraform.tfvars."
fi
ok "client id preenchido"

# ------------------------------------------------------------------ 5. apply
titulo "5. Plano completo"

terraform -chdir="$PROD" plan -out=tfplan
echo
confirmar "Aplicar este plano?" || { aviso "nada aplicado"; exit 0; }
terraform -chdir="$PROD" apply tfplan
rm -f "$PROD/tfplan"

# ------------------------------------------------------- 6. o que vem depois
titulo "Pronto. O que configurar agora"

BUCKET_SITE="$(terraform -chdir="$PROD" output -raw bucket_site)"
DISTRIBUICAO="$(terraform -chdir="$PROD" output -raw distribution_id)"
PAPEL="$(terraform -chdir="$PROD" output -raw deploy_role_arn)"

cat <<FIM

  No GitHub (Settings > Secrets and variables > Actions):

    secret   AWS_DEPLOY_ROLE   $PAPEL
    variable SITE_BUCKET       $BUCKET_SITE
    variable DISTRIBUTION_ID   $DISTRIBUICAO
    variable AWS_REGION        $REGIAO
    variable SITE_URL          https://$DOMINIO
    variable PUBLIC_IMG_BASE   https://$DOMINIO

  Falta ainda, fora do Terraform:

    - Criar a chave de acesso do usuário $(terraform -chdir="$PROD" output -raw cms_user)
      no console e entregar à Isabel por gerenciador de senhas.
    - Pôr o access key id em site/public/admin/config.yml.

  Lembre que a stack de imagem só passa a servir /fit-in/* no apply
  seguinte: rode este script mais uma vez para fechar isso.

FIM
