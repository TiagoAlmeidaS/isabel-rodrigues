# Site

Astro estático, sem framework de UI e sem Tailwind: o visual é CSS próprio com
tokens em `src/styles/global.css`. A decisão veio do desenho — as nove motions
são CSS escrito à mão, e utilitário no meio só atrapalharia.

```bash
npm install
cp .env.example .env    # preencha PUBLIC_IMG_BASE
npm run dev             # http://localhost:4321
npm run build           # dist/
npx astro check         # tipos
```

## Onde mexe o quê

| Caminho | O quê |
|---|---|
| `src/data/*.json` | Conteúdo editável pelo painel. Nenhum componente lê JSON direto. |
| `src/lib/conteudo.ts` | Porta única de leitura desses JSON. |
| `src/lib/imagem.ts` | Monta as URLs do CloudFront e o `srcset`. |
| `src/styles/global.css` | Tokens e as motions. |
| `public/admin/` | O painel (Sveltia CMS). |

## Fotos

Não existem no repositório. O `PUBLIC_IMG_BASE` aponta pro CloudFront e o
`imagem.ts` monta `/fit-in/<largura>x0/<caminho>`. As quatro larguras são
fixas (400, 800, 1280, 2000) — mudar isso multiplica transformações na AWS.

Sem `PUBLIC_IMG_BASE`, a build funciona: as fotos caem num caminho relativo e
o layout se segura na cor de fundo de cada foto. Dá pra desenvolver sem a CDN.

## Motion

Nove motions catalogadas no protótipo. O que está implementado aqui:

| # | Como foi feito |
|---|---|
| 01 marca | `sessionStorage` + classe `.abertura` no `<html>`, inline no `<head>` pra não piscar |
| 02 cortina | `clip-path` via `[data-reveal="cortina"]` |
| 03 Ken Burns | keyframe de 16 s na foto do hero |
| 04 reveal escalonado | IntersectionObserver + `--atraso` calculado por `[data-escalonar]` |
| 05 hover contido | `transition` em `.cartao:hover .foto img` |
| 06 faixa do nome | keyframe linear de 34 s |
| 08 nav solidifica | IntersectionObserver numa sentinela no fim do hero |
| 09 filete do link | `.filete::after` com `scaleX` |

**Mudança em relação ao plano:** a 02 e a 04 iam usar
`animation-timeline: view()` com IntersectionObserver de fallback. Ficaram só
com IntersectionObserver — um mecanismo só, que funciona em todo lugar, em vez
de dois caminhos para o mesmo efeito.

A 07 (cross-fade) não foi implementada: depende de ter duas fotos escolhidas
pra alternar, e isso é decisão de acervo, não de código.

Tudo desligado em `prefers-reduced-motion`.

## Deploy

`.github/workflows/deploy.yml` em push na `main` que toque `site/`. Assume o
papel criado por `infra/modules/ci-identity` via OIDC — sem chave guardada.

No repositório, configure:

| Tipo | Nome | Valor |
|---|---|---|
| secret | `AWS_DEPLOY_ROLE` | `terraform output -raw deploy_role_arn` |
| variable | `SITE_BUCKET` | `terraform output -raw bucket_site` |
| variable | `DISTRIBUTION_ID` | `terraform output -raw distribution_id` |
| variable | `PUBLIC_IMG_BASE` | domínio da stack de imagem |
| variable | `AWS_REGION` | `sa-east-1` |
| variable | `SITE_URL` | domínio do site |
