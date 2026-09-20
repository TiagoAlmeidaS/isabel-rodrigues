# Site Isabel Rodrigues — mapeamento e plano

Protótipo visual (privado): https://claude.ai/artifact/E1tYremS1e734R4g71A8xG

Oito pranchetas: Home desktop (animada), Ensaios (categoria), Agendamento
(funcional), Home celular, Sistema visual, Abertura de marca (em loop),
Catálogo de movimento (demos ao vivo) e Pipeline de fotos / CDN.

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

**Fase 2 — agenda real com sinal de 30–50%.** É o sinal, não a agenda, que
derruba o não-comparecimento a quase zero (padrão relatado por Setmore, AgendeMe
e Alboom no nicho de ensaios).

---

## 5. Pipeline de fotos e CDN

As fotos **não ficam no repositório**. O fluxo é:

1. **Isabel exporta do Lightroom** — JPG, lado maior 3000 px, qualidade 90,
   sRGB. Um arquivo por foto; ela nunca redimensiona nada à mão.
2. **Sobe pro bucket** (Cloudflare R2 ou Bunny Storage). O nome do arquivo é o
   contrato: `newborn/helena-03.jpg`.
3. **A CDN corta e converte** na hora, guardando em cache na borda.
4. **O site escolhe o tamanho** via `srcset`.

### Contrato de URL

```
original: /fotos/newborn/helena-03.jpg
pedido:   /cdn-cgi/image/width=960,format=auto,quality=82/fotos/newborn/helena-03.jpg
```

`format=auto` entrega AVIF pra quem aceita, WebP pro resto, JPG pro Safari
antigo — sem exportar três vezes.

### Larguras fixas (a regra que segura o custo)

| Largura | Onde aparece | Peso alvo (AVIF) |
|---|---|---|
| 400 px | Grade no celular | ~35 kB |
| 800 px | Card de categoria | ~90 kB |
| 1280 px | Galeria desktop | ~180 kB |
| 2000 px | Hero e foto aberta | ~380 kB |
| 24 px | Placeholder borrado (LQIP) | ~0,4 kB, inline no HTML |

Cinco variantes por foto, **sempre as mesmas**. Deixar a largura variar por
viewport multiplica transformações — é assim que uma conta gratuita vira
US$ 89/mês.

O LQIP de 24 px vai embutido no HTML e aparece borrado enquanto a foto real
carrega. É o que impede a animação 02 (cortina) de abrir sobre um retângulo
cinza.

### Custo (verificado em setembro/2026)

| Opção | Modelo | Custo previsto aqui |
|---|---|---|
| **Cloudflare Images + R2** (recomendado) | 5.000 transformações únicas/mês grátis em imagens remotas, depois US$ 0,50/mil | **US$ 0** — 300 fotos × 5 larguras = 1.500 variantes, cacheadas |
| Bunny Optimizer | US$ 9,50/mês por site, otimizações ilimitadas + ~US$ 0,01/GB de banda | ~US$ 10/mês, previsível |
| Cloudinary | 25 créditos/mês grátis (1 crédito = 1 GB banda *ou* 1 GB storage *ou* mil transformações, mesmo balde); degrau seguinte US$ 89/mês | Grátis, mas com teto próximo |

Recomendação: **Cloudflare Images + R2**. Com o volume dela cabe folgado no
gratuito, e as variantes ficam cacheadas para sempre. Bunny vira a escolha se o
tráfego crescer e o preço fixo valer mais que o zero.

### Trocar uma foto

1. Sobe o JPG no bucket com o nome que já está lá, substituindo.
2. Limpa o cache daquele caminho (um botão no painel).
3. Pronto — nenhum deploy, nenhum código, nenhum desenvolvedor.

---

## 6. Como isso vira site

1. Astro ou Next estático + Tailwind na Vercel. Sem CMS na v1.
2. As fotos vêm da CDN (seção 5), nunca do repositório.
3. Cada caixa cinza do protótipo vira uma foto real do acervo.
4. Cada `[COLCHETE]` é um dado que falta.

## 7. O que ainda falta decidir

- Nome/cidade de atendimento confirmados e número de WhatsApp.
- Os três pacotes e seus valores (ou se os valores ficam fora do site).
- Depoimentos reais autorizados.
- Se entra "Smash the cake" ou se a quarta categoria é corporativo/eventos.
