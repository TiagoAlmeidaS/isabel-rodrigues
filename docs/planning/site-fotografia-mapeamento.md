# Site Isabel Rodrigues — mapeamento e plano

Protótipo visual (privado): https://claude.ai/artifact/E1tYremS1e734R4g71A8xG

Dez pranchetas: Home desktop (animada), Ensaios (categoria), Agendamento
(funcional), Home celular, Sistema visual, Abertura de marca (em loop),
Catálogo de movimento (demos ao vivo), Fotos na AWS, Painel da Isabel (abas
funcionam), Painel — análise de arquitetura e Infra — Terraform e ambientes.

O código da infraestrutura vive em [`infra/`](../../infra/).

---

## 1. O padrão que se repete em todo site de fotógrafo

1. **Imagem primeiro.** O hero é a melhor foto do acervo em tela cheia, não um
   banner com texto por cima de um fundo colorido.
2. **Categorias, nunca galeria única.** Gestante / Newborn / Família / Smash the
   cake. Quem chega pelo Instagram quer confirmar em cinco segundos que ela
   fotografa o que ele precisa.
3. **Whitespace como moldura.** Margens generosas imitam galeria de arte física
   e fazem a foto parecer mais cara do que num grid apertado.
4. **Contato visível em qualquer ponto do scroll**, não só no rodapé.
5. **"Sobre" com rosto e texto em 1ª pessoa.** É o bloco que converte um ensaio
   íntimo — a pessoa vai deixar um recém-nascido no colo de alguém.
6. **A home seleciona, não despeja.** Quatro a seis trabalhos e um convite a
   entrar na galeria completa.

### Referências mais próximas do caso dela

| Referência | O que roubar |
|---|---|
| Margaret Rajic | Texto fixo à esquerda, galeria rolando à direita |
| Claire Byrne | Duas colunas sobre fundo creme |
| Lieben Photography | Navegação multi-categoria bem resolvida |
| Samantha Turner | CTA de agendamento presente em todo scroll |

Repertório de topo (para linguagem, não para copiar layout): Elizaveta
Porodina, Kenichi Aikawa.

---

## 2. Sistema visual adotado

| Token | Valor | Uso |
|---|---|---|
| Areia | `#F7F4EF` | fundo |
| Tinta | `#1C1A17` | texto principal |
| Terracota | `#A9674F` | acento (traços, títulos grandes) |
| Terracota escuro | `#8A4F3A` | links e botão primário (4,5:1) |
| Faixa | `#EFE9E0` | seções destacadas |
| Texto 2 | `#5B544B` | legendas |
| WhatsApp | `#0F7A3D` | CTA de agendamento |

Tipografia: **Cormorant Garamond** 300 nos títulos (32–84 px, entrelinha
1.0–1.15) sobre **Jost** no corpo (17 px, entrelinha 1.75, medida máx. 560 px).
Rótulos em 12–14 px com espacejamento 0,16–0,24 em.

Todos os pares de texto/fundo passam em 4,5:1. O terracota claro **não** é usado
para texto pequeno.

---

## 3. Movimento — catálogo completo

Nove motions, todas em CSS, demonstradas ao vivo na prancheta **Catálogo de
movimento**.

| # | Motion | Gatilho | Duração | Onde |
|---|---|---|---|---|
| 01 | Marca que sobe (palavra a palavra, mascarada) | Ao carregar | 900 ms, 160 ms entre palavras | Wordmark do topo |
| 02 | Cortina (`clip-path` abrindo do centro) | Ao entrar na tela | 1200 ms | 2–3 fotos principais |
| 03 | Ken Burns (1.0 → 1.09) | Contínuo | 16 s | Só o hero |
| 04 | Reveal escalonado (fade + 26 px) | Ao entrar na tela | 950 ms, 120 ms entre irmãos | Toda grade de fotos |
| 05 | Hover contido (escala 1.045 + legenda subindo) | Hover | 750 ms | Todo card de foto |
| 06 | Faixa do nome rolando | Contínuo | 34 s linear | Entre galeria e rodapé |
| 07 | Troca em cross-fade | A cada 3,5 s | 800 ms | Quadro de destaque |
| 08 | Nav que solidifica | Ao sair do hero | 300 ms | Cabeçalho |
| 09 | Filete do link (scaleX da direita p/ esquerda) | Hover | 450 ms | Todo link de texto |

**Motion de marca** (o pedido "foco em marca e nome") são a 01, a 02 e a 06 —
a assinatura de abertura, o obturador que revela a foto e o nome atravessando a
tela. A 01 e a 02 rodam **uma vez por sessão** (`sessionStorage`), não a cada
navegação: assinatura que repete vira atraso.

### Orçamento de movimento

No máximo três animações simultâneas na tela. A foto sempre ganha da animação —
se a imagem ainda não carregou, o reveal espera. Tudo desligado em
`prefers-reduced-motion`.

### Implementação

`animation-timeline: view()` para 02 e 04, transitions para 05/08/09, keyframes
infinitos para 03 e 06. Fallback em `IntersectionObserver` onde `view()` não
pegar. Nenhuma biblioteca — nem GSAP, nem Framer Motion.

### Ordem de implementação

- **Semana 1** — 04, 05 e 09. Dão 80% da sensação e não dependem de arte nova.
- **Semana 2** — 03 e 08. Precisam do hero definitivo escolhido.
- **Semana 3** — 01 e 02, a assinatura de marca.
- 06 entra a qualquer momento (é independente).

**Não fazer:** parallax no hero em celular (trava o scroll), autoplay de vídeo,
cursor customizado. Custam mais do que entregam num site de foto.

---

## 4. Agendamento

**Fase 1 — WhatsApp-first (é o padrão do nicho no Brasil).**
Formulário de quatro campos (tipo de ensaio, data, período, nome + cidade) monta
a mensagem e abre `wa.me/55...?text=` já preenchida:

> Oi, Isabel! Sou a Marina.
> Quero agendar um ensaio Newborn para 12 de março, de preferência no período da tarde.
> Sou de Brasília.
> Vim pelo site. Tem horário?

Zero backend, zero mensalidade, e ela continua fechando onde já fecha hoje.
Nada é enviado sem ela ver — o botão só abre o WhatsApp com o texto escrito.

**Valores não aparecem no site.** A seção "Investimento" lista o que está
incluso em cada pacote e termina num CTA para receber a tabela no WhatsApp.
Além de ser o padrão do nicho, isso força o contato — que é onde ela fecha — e
evita que o preço seja comparado fora de contexto por quem nunca viu o trabalho.

**Fase 2 — agenda real com sinal de 30–50%.** É o sinal, não a agenda, que
derruba o não-comparecimento a quase zero (padrão relatado por Setmore, AgendeMe
e Alboom no nicho de ensaios).

---

## 5. Pipeline de fotos na AWS

As fotos **não ficam no repositório**. Decisão: **S3 + CloudFront + Lambda**.

1. **Isabel arrasta o JPG no `/admin`.** O Sveltia assina com SigV4 e envia do
   navegador direto pro bucket — sem servidor no meio.
2. **S3 guarda só o original** de 3000 px. Bucket privado: ninguém acessa o S3
   direto, só o CloudFront via OAC.
3. **A Lambda corta e converte** no primeiro pedido de cada variante (sharp),
   devolvendo AVIF, WebP ou JPEG.
4. **CloudFront serve e guarda** com TTL de um ano. Da segunda visita em diante
   a Lambda nem acorda.

### Contrato de URL

```
no bucket:  s3://isabel-fotos/newborn/helena-03.jpg
o site pede: img.isabelrodrigues.com.br/fit-in/960x0/newborn/helena-03.jpg
```

O formato **não vai na URL**. Uma CloudFront Function lê o `Accept` do
navegador e normaliza em três valores — `avif`, `webp`, `jpeg` — que entram na
chave de cache. Cada largura tem no máximo três versões guardadas e o navegador
recebe a melhor que aceita, sem nada no HTML.

### Larguras fixas

| Largura | Onde aparece | Peso alvo (AVIF) |
|---|---|---|
| 400 px | Grade no celular | ~35 kB |
| 800 px | Card de categoria | ~90 kB |
| 1280 px | Galeria desktop | ~180 kB |
| 2000 px | Hero e foto aberta | ~380 kB |
| 24 px | Placeholder borrado (LQIP) | ~0,4 kB, inline no HTML |

Quatro larguras × três formatos = **12 variantes por foto no máximo**, geradas
uma vez na vida e cacheadas por um ano.

### Recursos na conta AWS

| Recurso | O quê |
|---|---|
| S3 | Bucket `isabel-fotos`, privado, versionamento ligado |
| CloudFront | Distribuição + OAC apontando pro bucket |
| Lambda | Solução oficial *Dynamic Image Transformation for CloudFront*, arquitetura Lambda (até 6 MB) — uma stack CloudFormation, não código nosso |
| CloudFront Function | Normaliza o `Accept` em avif/webp/jpeg |
| IAM | Usuário `isabel-cms`: Get/Put/Delete/List **só nesse bucket** |
| CORS | GET, PUT, DELETE, HEAD liberados pro domínio do site (o SigV4 dispara preflight) |

### Custo (verificado em setembro/2026)

| Serviço | Preço | Aqui dá |
|---|---|---|
| CloudFront | 1 TB de saída e 10 M de requisições/mês, sempre grátis | US$ 0 |
| S3 Standard | US$ 0,023 por GB/mês | ~US$ 0,12 com 5 GB de originais |
| Lambda | Por execução | Centavos — ~1.500 execuções na vida do site |

**Atenção:** o S3 não tem mais free tier permanente. Conta nova recebe US$ 200
de crédito por 6 meses; depois a conta vem, ainda que em centavos. Vale criar um
orçamento no Billing.

### Pontos de atenção

- **A chave IAM fica no navegador dela.** O Sveltia assina no browser, então a
  Secret Access Key mora ali. Por isso: usuário IAM dedicado, sem acesso ao
  console, escopo mínimo naquele bucket. Nunca a chave root.
- **Trocar foto: versione, não invalide.** Invalidação no CloudFront é cobrada
  por caminho depois de uma cota mensal. Com TTL de um ano, a troca se faz
  mudando o nome do arquivo (`helena-03-v2.jpg`) — o painel já faz isso.
- **Vindo do Cloudflare:** em dinheiro é empate (os dois ficam perto de zero
  nessa escala). O que muda é montagem — uma stack, IAM e CORS aqui contra um
  botão lá. Escolhido AWS por ser o terreno de casa.

---

## 6. Painel de administração

Isabel precisa trocar fotos, mexer em categorias e atualizar o telefone sozinha.
Três caminhos analisados:

| | Como funciona | Custo | Prazo | Risco |
|---|---|---|---|---|
| **A — Sveltia CMS** (escolhido) | Página `/admin` no próprio site; salva JSON no repositório e envia as fotos direto pro S3 via SigV4 | Centavos/mês de S3 | 2–3 dias | Ainda pré-1.0 |
| B — CMS hospedado (Sanity, Storyblok) | Painel pronto, app de celular | Grátis até um teto, depois assinatura | 2–4 dias | Fotos vivem na plataforma deles; migrar dá trabalho |
| C — Painel próprio (Next + D1 + login) | Tudo nosso, login por e-mail | Infra ~R$ 0, caro em horas | 2–3 semanas | Toda falha de segurança é nossa |

**Decisão: A + AWS.** O Sveltia tem integração nativa com Amazon S3 e faz
upload do navegador direto pro bucket, sem proxy — exatamente o pipeline da
seção 5. O conteúdo continua sendo dela: JSON no repositório, JPG no S3.

**Duas credenciais, não uma:** login no painel com conta do GitHub, e uma chave
IAM que ela cola uma vez para poder enviar fotos. Criamos as duas — cerca de 15
minutos. Se conta do GitHub for inaceitável para ela, o caminho é o C, e o
preço são duas semanas a mais.

### O que fica editável

| Arquivo | Conteúdo |
|---|---|
| `fotos.json` | arquivo, categoria, ordem, descrição, se é capa |
| `categorias.json` | nome, endereço, capa, visível, ordem na home |
| `textos.json` | título da abertura, sobre, depoimentos |
| `contato.json` | WhatsApp, e-mail, Instagram, cidade |
| `agenda.json` | mês, datas abertas, faixa ligada ou não |

**Não fica editável, de propósito:** cores, fontes, espaçamento e animações.
Painel que deixa mexer no layout vira site quebrado em três meses.

### Caminho de uma alteração

1. Ela arrasta as fotos no `/admin` e clica em Publicar.
2. Os JPG vão pro S3; o JSON vira um commit.
3. O commit dispara o build — 60 a 90 segundos.
4. Site no ar. Errou? O commit anterior volta em um clique.

### Acesso

Uma conta só, a dela, com escrita no repositório. Sem níveis de usuário: um
site de uma fotógrafa não tem equipe, e papel a mais é superfície de erro a
mais. Se um dia tiver assistente, aí se cria o segundo acesso.

### Plano B

Se o Sveltia travar, o conteúdo continua sendo JSON num repositório — qualquer
outro CMS git-based (Decap à frente) lê o mesmo formato. Não dá refém.

---

## 7. Infraestrutura como código

Tudo em Terraform, uma conta AWS, **um ambiente por diretório**. Hoje existe
`prod` (Production); `stg` será uma cópia de `envs/prod` com outro
`terraform.tfvars` — mesmos módulos, só valores diferentes.

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

### State

Bucket S3 versionado e criptografado, uma chave por ambiente
(`prod/terraform.tfstate`), com trava nativa via `use_lockfile` — dispensa a
tabela DynamoDB que a documentação antiga pede. O bucket tem
`prevent_destroy`.

### Decisão registrada: CloudFormation dentro do Terraform

É um cheiro, e assumido. A solução de imagem só existe como template CFN, e em
troca a AWS mantém a Lambda — sharp, formatos novos, patches. Escrever a nossa
daria layer em arm64, build no CI e atualização de segurança por nossa conta.
Para este porte, não paga. O Terraform segue dono do ciclo de vida da stack
via `aws_cloudformation_stack`.

### O que o Terraform não faz

- **Não publica o site.** Cria a casa; o CI faz `aws s3 sync ./dist` e
  invalida o cache.
- **Não sobe foto.** As fotos vão do navegador da Isabel direto pro bucket.
- **Não cria a chave dela**, por padrão (`create_cms_access_key = false`). Se
  criasse, o segredo ficaria no state. Criar no console e entregar por
  gerenciador de senhas.

### Dois cuidados antes do primeiro apply

1. `image_solution_template_url` precisa apontar para uma **versão fixa** do
   template, nunca `latest`.
2. Os **nomes dos parâmetros** da stack mudam entre releases — conferir contra
   a versão fixada. Por isso `parameters` é um mapa aberto, definido no
   ambiente.

### Estado atual do código

Escrito, **não validado**: não havia binário do Terraform no ambiente onde foi
gerado. O primeiro `terraform plan` é revisão, não formalidade.

---

## 8. Como isso vira site

1. Astro ou Next estático + Tailwind na Vercel. Sem CMS na v1.
2. As fotos vêm da CDN (seção 5), nunca do repositório.
3. Cada caixa cinza do protótipo vira uma foto real do acervo.
4. Cada `[COLCHETE]` é um dado que falta.

## 9. O que ainda falta decidir

- Nome/cidade de atendimento confirmados e número de WhatsApp.
- O que está incluso em cada pacote (os valores ficam fora do site, por decisão).
- Se Isabel aceita ter uma conta do GitHub para acessar o painel.
- Quem é o dono da conta AWS (ela ou você) — muda quem paga e quem recebe alerta de billing.
- O domínio e o ID da zona no Route 53 (`[COLCHETES]` em `infra/envs/prod/terraform.tfvars`).
- A versão do template da solução de imagem a fixar.
- Depoimentos reais autorizados.
- Se entra "Smash the cake" ou se a quarta categoria é corporativo/eventos.
