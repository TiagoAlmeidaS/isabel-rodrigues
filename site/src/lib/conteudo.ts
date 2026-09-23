/**
 * Ponto único de leitura do conteúdo editável. Tudo que a Isabel mexe no
 * painel entra por aqui — nenhum componente lê JSON direto.
 */

import categoriasJson from '../data/categorias.json';
import fotosJson from '../data/fotos.json';
import textosJson from '../data/textos.json';
import contatoJson from '../data/contato.json';
import agendaJson from '../data/agenda.json';

export interface Categoria {
  slug: string;
  nome: string;
  chamada: string;
  descricao: string;
  capa: string;
  visivel: boolean;
  ordem: number;
}

export interface Foto {
  arquivo: string;
  categoria: string;
  descricao: string;
  capa?: boolean;
  /** Cor dominante, usada como fundo enquanto a foto carrega. */
  cor?: string;
  ordem?: number;
}

export interface Contato {
  whatsapp: string;
  whatsappExibicao: string;
  email: string;
  instagram: string;
  cidade: string;
  mensagemPadrao: string;
}

export interface Pacote {
  nome: string;
  itens: string[];
  destaque: boolean;
}

export interface Agenda {
  mes: string;
  datasAbertas: number;
  mostrarFaixa: boolean;
}

export const textos = textosJson;
export const contato = contatoJson as Contato;
export const agenda = agendaJson as Agenda;

/**
 * Pacotes são opcionais no painel: com a lista vazia o Sveltia pode gravar
 * [] ou simplesmente omitir a chave, e um pacote sem itens pode vir sem
 * "itens". Tudo chega aqui já normalizado.
 */
export const pacotes: Pacote[] = (
  (textosJson as { pacotes?: Partial<Pacote>[] }).pacotes ?? []
).map((p) => ({
  nome: p.nome ?? '',
  itens: p.itens ?? [],
  destaque: p.destaque ?? false,
}));

const categorias = (categoriasJson.categorias ?? []) as Categoria[];
const fotos = (fotosJson.fotos ?? []) as Foto[];

const porOrdem = <T extends { ordem?: number }>(a: T, b: T) =>
  (a.ordem ?? 999) - (b.ordem ?? 999);

/**
 * Fotos apontando para um ensaio que não existe mais, agrupadas pelo slug
 * órfão. Acontece quando o campo "Endereço" de uma categoria é editado ou
 * a categoria é removida: o vínculo é por string, então as fotos ficam
 * para trás sem que nada reclame — e a galeria some do site.
 */
export function fotosOrfas(
  listaFotos: Foto[] = fotos,
  listaCategorias: Categoria[] = categorias,
): Map<string, Foto[]> {
  const slugs = new Set(listaCategorias.map((c) => c.slug));
  const orfas = new Map<string, Foto[]>();

  for (const foto of listaFotos) {
    if (slugs.has(foto.categoria)) continue;
    const mesmoSlug = orfas.get(foto.categoria) ?? [];
    mesmoSlug.push(foto);
    orfas.set(foto.categoria, mesmoSlug);
  }

  return orfas;
}

/**
 * Aviso no log do build. Não derruba a publicação de propósito: uma foto
 * órfã não justifica deixar o site inteiro sem atualizar. O que ela vê é a
 * galeria vazia; o log diz o porquê.
 */
function avisarSobreOrfas(): void {
  for (const [slug, lista] of fotosOrfas()) {
    console.warn(
      `[conteudo] ${lista.length} foto(s) apontam para o ensaio "${slug}", ` +
        'que não existe em categorias.json. Elas não aparecem em lugar ' +
        'nenhum do site. Provável causa: o endereço da categoria foi ' +
        'alterado ou a categoria foi removida no painel.',
    );
  }
}

avisarSobreOrfas();

/** Categorias que aparecem na home e no menu. */
export function categoriasVisiveis(): Categoria[] {
  return categorias.filter((c) => c.visivel).sort(porOrdem);
}

/**
 * Todas as categorias, inclusive ocultas: o endereço continua funcionando
 * para quem já recebeu o link, mesmo antes do anúncio.
 */
export function todasCategorias(): Categoria[] {
  return [...categorias].sort(porOrdem);
}

export function categoriaPorSlug(slug: string): Categoria | undefined {
  return categorias.find((c) => c.slug === slug);
}

export function fotosDe(slug: string): Foto[] {
  return fotos.filter((f) => f.categoria === slug).sort(porOrdem);
}

/** Capa da categoria: a marcada no painel, senão a primeira da lista. */
export function capaDe(categoria: Categoria): string {
  const marcada = fotosDe(categoria.slug).find((f) => f.capa);
  return marcada?.arquivo ?? categoria.capa ?? '';
}

/** Uma seleção para a home, sem repetir categoria quando dá para evitar. */
export function destaques(quantidade = 5): Foto[] {
  const capas = categoriasVisiveis()
    .map((c) => fotosDe(c.slug).find((f) => f.capa) ?? fotosDe(c.slug)[0])
    .filter((f): f is Foto => Boolean(f));

  if (capas.length >= quantidade) return capas.slice(0, quantidade);

  const resto = fotos.filter((f) => !capas.includes(f));
  return [...capas, ...resto].slice(0, quantidade);
}

/** Link do WhatsApp com a mensagem já escrita. */
export function linkWhatsApp(preenchimento: Record<string, string> = {}): string {
  const texto = contato.mensagemPadrao.replace(
    /\{(\w+)\}/g,
    (_, campo: string) => preenchimento[campo] ?? '',
  );
  return `https://wa.me/${contato.whatsapp}?text=${encodeURIComponent(texto.trim())}`;
}
