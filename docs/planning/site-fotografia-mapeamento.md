# Site Isabel Rodrigues — mapeamento e plano

Protótipo visual (privado): https://claude.ai/artifact/E1tYremS1e734R4g71A8xG

Cinco pranchetas: Home desktop, Ensaios (categoria), Agendamento (funcional),
Home celular, Sistema visual.

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

## 3. Animações — as 3 que entregam 80% da sensação

1. **Scroll reveal escalonado** — fade + 20 px de subida, 60 ms entre irmãos,
   uma vez só por elemento.
2. **Ken Burns no hero** — zoom 1.0 → 1.08 em 12 s, linear.
3. **Hover contido** — imagem a 1.03 em 600 ms, legenda subindo 8 px.

Depois, se sobrar fôlego: parallax leve, nav que solidifica ao sair do hero,
transição de página com View Transitions.

Tudo em CSS (scroll-driven animations + transitions). **Sem GSAP, sem Framer
Motion** — economiza ~40 kb num site que já carrega imagens pesadas. Respeitar
`prefers-reduced-motion` desligando 1 e 2.

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

## 5. Como isso vira site

1. Astro ou Next estático + Tailwind, hospedado na Vercel de graça. Sem CMS na v1.
2. Fotos em `.avif`/`.webp` em três larguras, `loading="lazy"` abaixo da dobra.
   É o que decide entre abrir em 1 s ou 6 s no 4G.
3. Cada caixa cinza do protótipo vira uma foto real do acervo.
4. Cada `[COLCHETE]` é um dado que falta: valores, textos em 1ª pessoa,
   WhatsApp, e-mail, depoimentos reais.

## 6. O que ainda falta decidir

- Nome/cidade de atendimento confirmados e número de WhatsApp.
- Os três pacotes e seus valores (ou se os valores ficam fora do site).
- Depoimentos reais autorizados.
- Se entra "Smash the cake" ou se a quarta categoria é corporativo/eventos.
