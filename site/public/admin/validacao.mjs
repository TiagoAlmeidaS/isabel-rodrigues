/**
 * Avisos dentro do painel, na hora de salvar.
 *
 * O site já detecta foto órfã e endereço inválido, mas só no log do build,
 * no GitHub Actions — que a Isabel não lê. Na prática o que ela via era a
 * galeria vazia, sem explicação nenhuma. Aqui o aviso chega onde ela está,
 * no momento em que o problema é criado, e com o nome do ensaio e das
 * fotos envolvidas.
 *
 * Dois momentos:
 *
 *   - Salvando FOTOS: alguma aponta para um ensaio que não existe mais.
 *     Isso bloqueia, porque a foto simplesmente não apareceria em lugar
 *     nenhum e não há escolha sensata a fazer.
 *
 *   - Salvando ENSAIOS: o endereço de um ensaio mudou e deixa fotos para
 *     trás. Isso pergunta, porque renomear pode ser exatamente o que ela
 *     quer — ela só precisa saber o preço antes.
 *
 * Regra de ouro: na dúvida, deixa salvar. Se a consulta ao repositório
 * falhar, se o formato vier diferente, se qualquer coisa inesperada
 * acontecer, o save segue. Um aviso que não conseguiu rodar não pode virar
 * um painel travado.
 */

const REPO = 'TiagoAlmeidaS/isabel-rodrigues';
const BRANCH = 'main';
const DADOS = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/site/src/data`;

/** Acima disto desiste da consulta e deixa salvar. */
const TIMEOUT_MS = 8000;

// ---------------------------------------------------------------- regras

/** Fotos cujo ensaio não existe, agrupadas pelo endereço órfão. */
export function fotosOrfas(fotos, categorias) {
  const slugs = new Set(categorias.map((c) => c?.slug).filter(Boolean));
  const porSlug = new Map();

  for (const foto of fotos) {
    const slug = foto?.categoria;

    if (!slug || slugs.has(slug)) continue;
    porSlug.set(slug, [...(porSlug.get(slug) ?? []), foto]);
  }

  return porSlug;
}

/** Nome de arquivo legível, sem a URL e sem a transformação da CDN. */
export function nomeCurto(arquivo) {
  if (!arquivo) return 'foto sem arquivo';

  const partes = String(arquivo).split('/');

  return partes[partes.length - 1] || String(arquivo);
}

export function mensagemOrfas(porSlug) {
  const linhas = [...porSlug.entries()].map(([slug, fotos]) => {
    const nomes = fotos.map((f) => nomeCurto(f.arquivo)).join(', ');

    return `• ${fotos.length} foto(s) no ensaio "${slug}": ${nomes}`;
  });

  return [
    'Estas fotos estão marcadas para um ensaio que não existe mais:',
    '',
    ...linhas,
    '',
    'Elas não vão aparecer em lugar nenhum do site.',
    'Abra cada uma e escolha um ensaio da lista em "Ensaio".',
  ].join('\n');
}

/**
 * Ensaios que sumiram da lista e ainda têm foto marcada. Acontece quando o
 * endereço é editado (o antigo deixa de existir) ou o ensaio é removido.
 */
export function ensaiosQuePerdemFotos(fotos, categoriasNovas) {
  return fotosOrfas(fotos, categoriasNovas);
}

export function mensagemPerdaDeFotos(porSlug) {
  const linhas = [...porSlug.entries()].map(
    ([slug, fotos]) => `• "${slug}" — ${fotos.length} foto(s)`,
  );

  return [
    'Atenção: este ensaio deixou de existir com o endereço que tinha.',
    '',
    ...linhas,
    '',
    'As fotos acima continuam gravadas, mas somem do site até você',
    'reabrir cada uma na aba Fotos e escolher o ensaio de novo.',
    '',
    'Quer salvar mesmo assim?',
  ].join('\n');
}

// ------------------------------------------------------------- consultas

async function buscarJson(arquivo, fetchImpl = fetch) {
  const r = await fetchImpl(`${DADOS}/${arquivo}`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!r.ok) throw new Error(`HTTP ${r.status} em ${arquivo}`);

  return r.json();
}

// ------------------------------------------------------------ integração

/** Erro nesta forma vira diálogo com a mensagem visível no painel. */
function bloquear(mensagem) {
  return new Error('saving_failed', { cause: new Error(mensagem) });
}

/**
 * Decide o que fazer com um save. Devolve null para deixar passar, ou um
 * Error para barrar. Separado do CMS para poder ser testado.
 */
export async function avaliarSave({ caminho, dados, buscar, perguntar }) {
  if (/fotos\.json$/.test(caminho)) {
    const { categorias = [] } = await buscar('categorias.json');
    const orfas = fotosOrfas(dados.fotos ?? [], categorias);

    return orfas.size ? bloquear(mensagemOrfas(orfas)) : null;
  }

  if (/categorias\.json$/.test(caminho)) {
    const { fotos = [] } = await buscar('fotos.json');
    const perdidas = ensaiosQuePerdemFotos(fotos, dados.categorias ?? []);

    if (!perdidas.size) return null;

    // Renomear pode ser o que ela quer; ela só precisa saber o preço.
    return perguntar(mensagemPerdaDeFotos(perdidas))
      ? null
      : bloquear('Nada foi salvo. Os endereços dos ensaios continuam como estavam.');
  }

  return null;
}

export function registrar(CMS, { buscar = buscarJson, perguntar = confirm } = {}) {
  CMS.registerEventListener({
    name: 'preSave',
    handler: async ({ entry }) => {
      let problema = null;

      try {
        problema = await avaliarSave({
          caminho: entry.get('path') ?? '',
          dados: entry.get('data')?.toJS() ?? {},
          buscar,
          perguntar,
        });
      } catch (e) {
        // Consulta falhou, formato inesperado, o que for: deixa salvar. O
        // build ainda avisa, e um painel travado é pior que um aviso
        // perdido.
        console.warn('[validacao] aviso não pôde rodar; salvando assim mesmo', e);

        return undefined;
      }

      if (problema) throw problema;

      return undefined;
    },
  });
}
