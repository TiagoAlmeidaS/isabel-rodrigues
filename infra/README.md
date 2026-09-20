# Infraestrutura

Tudo em Terraform, uma conta AWS, um ambiente por diretório. Hoje existe
`prod`; `stg` é uma cópia de `envs/prod` com outro `terraform.tfvars` — os
módulos são os mesmos, nada é duplicado.

```
infra/
  bootstrap/          roda uma vez, cria o bucket de state
  modules/
    photo-storage/    bucket dos originais + CORS + versionamento
    image-delivery/   stack da solução de imagem da AWS
    site-hosting/     S3 + CloudFront + OAC + ACM + Route 53
    cms-identity/     usuário IAM que o painel usa pra enviar fotos
  envs/
    prod/             Production
```

## Primeira subida

O domínio é `isabelrodrigues.com.br`, registrado no Registro.br. A zona do
Route 53 é criada aqui, mas a **delegação é manual** — e o certificado ACM só
valida depois dela. Por isso a ordem abaixo tem uma parada no meio.

```bash
# 1. state (uma vez na vida, state local)
cd infra/bootstrap
terraform init && terraform apply

# 2. preencha o [COLCHETE] que sobrou (versão do template de imagem)
$EDITOR infra/envs/prod/terraform.tfvars

# 3. cria só a zona e pega os nameservers
cd ../envs/prod
terraform init
terraform apply -target=aws_route53_zone.principal
terraform output nameservers

# 4. PARADA: cole esses nameservers no Registro.br e espere propagar.
#    Sem isso o passo 5 fica preso validando o certificado.

# 5. o resto
terraform plan -out=tfplan   # leia o plano
terraform apply tfplan
```

### Segundo apply, por causa das imagens

A distribuição do site serve as fotos em `/fit-in/*` apontando para a
distribuição criada pela stack de imagem. Essa URL só existe depois que a
stack sobe, então o primeiro apply cria o site **sem** esse caminho e o
segundo o adiciona. É de propósito: a alternativa seria uma dependência
circular. Confira também `imagens_output_key` — o nome do output muda entre
versões do template.

## Antes do primeiro apply, confira duas coisas

1. **`image_solution_template_url`** precisa apontar para uma **versão fixa** do
   template da solução *Dynamic Image Transformation for CloudFront*, nunca
   para `latest`. Upgrade é decisão, não acidente.
2. **Os nomes dos parâmetros** dessa stack (`SourceBuckets`, `CorsEnabled`,
   `CorsOrigin`, …) mudam entre releases. Abra o template da versão fixada e
   confirme antes de rodar — é por isso que `parameters` é um mapa aberto em
   vez de campos fixos no módulo.

## A chave do CMS

`create_cms_access_key` é `false` de propósito. Se virar `true`, o Terraform
cria a chave e **o segredo fica no state** — que estaria criptografado e
privado, mas continua sendo um segredo em repouso num lugar que muita gente
acaba tendo acesso.

O caminho recomendado: criar a chave no console para o usuário
`isabel-prod-cms` e entregar à Isabel por um gerenciador de senhas. O usuário
já nasce com escopo mínimo (Get/Put/Delete/List só no bucket de fotos, sem
acesso ao console), porque a chave vive no navegador dela — o Sveltia assina
no browser.

## Deploy do site

O Terraform cria a casa; o CI põe o conteúdo:

```bash
aws s3 sync ./dist "s3://$(terraform output -raw bucket_site)" --delete
aws cloudfront create-invalidation \
  --distribution-id "$(terraform output -raw distribution_id)" \
  --paths '/*'
```

Fotos não passam por aqui: vão do navegador da Isabel direto pro bucket de
originais.

## Custo esperado

CloudFront tem 1 TB de saída e 10 M de requisições por mês sempre grátis, o
que cobre esse site inteiro. O que sobra é S3 (~US$ 0,023/GB/mês) e alguns
centavos de Lambda. **O S3 não tem mais free tier permanente** — conta nova
recebe US$ 200 de crédito por 6 meses. Crie um orçamento no Billing com
alerta, não confie na memória.

## Ainda não rodou

Este código foi escrito mas **não passou por `terraform validate` nem `plan`**
— não há binário do Terraform no ambiente onde foi gerado. Trate o primeiro
`plan` como revisão, não como formalidade.
