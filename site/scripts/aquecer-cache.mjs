/**
 * Pede à CDN todas as variantes de todas as fotos, logo depois do deploy.
 *
 * Sem isto, quem paga a transformação é o primeiro visitante: uma variante
 * fria levava ~30s para ser gerada. Como a Isabel sobe a foto e abre o
 * site em seguida, esse primeiro visitante era quase sempre ela — daí a
 * impressão de site lento.
 *
 * É um aquecimento, não um teste: falha de variante não derruba o deploy,
 * só aparece no resumo. O site já está no ar quando isto roda.
 */
import { readFileSync } from 'node:fs';

const BASE = (process.env.PUBLIC_IMG_BASE ?? '').replace(/\/$/, '');
const LARGURAS = [400, 800, 1280];
const QUALIDADE = { avif: 40, webp: 78, jpeg: 82 };
/** Acima disto a variante é dada como perdida e o deploy segue. */
const TIMEOUT_MS = 45_000;
/** A Lambda de transformação é o gargalo; não adianta empurrar mais. */
const SIMULTANEOS = 4;

const json = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));

/** Mesma redução de src/lib/imagem.ts: aceita chave ou URL já transformada. */
const chave = (valor) => {
  if (!valor) return '';
  let caminho = valor;

  if (/^https?:\/\//i.test(valor)) {
    try {
      caminho = new URL(valor).pathname;
    } catch {
      /* não era URL de verdade */
    }
  }

  return caminho
    .replace(/^\//, '')
    .replace(/^fit-in\/\d+x\d+\//, '')
    .replace(/^(filters:[^/]+\/)+/, '');
};

const { fotos = [] } = json('../src/data/fotos.json');
const { categorias = [] } = json('../src/data/categorias.json');

const arquivos = [
  ...new Set([...fotos.map((f) => f.arquivo), ...categorias.map((c) => c.capa)].map(chave)),
].filter(Boolean);

const urls = arquivos.flatMap((k) =>
  LARGURAS.flatMap((l) =>
    Object.entries(QUALIDADE).map(
      ([f, q]) => `${BASE}/fit-in/${l}x0/filters:format(${f})/filters:quality(${q})/${k}`,
    ),
  ),
);

if (!BASE) {
  console.log('[aquecer] PUBLIC_IMG_BASE vazio — nada a fazer.');
  process.exit(0);
}

console.log(`[aquecer] ${arquivos.length} foto(s), ${urls.length} variante(s).`);

const falhas = [];
const fila = [...urls];

const trabalhar = async () => {
  for (let url = fila.shift(); url; url = fila.shift()) {
    const inicio = Date.now();

    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const seg = ((Date.now() - inicio) / 1000).toFixed(1);

      if (!r.ok) {
        falhas.push(`HTTP ${r.status} (${seg}s) ${url}`);
        continue;
      }

      // Só cabeçalho não basta: o corpo é o que força a transformação.
      await r.arrayBuffer();
    } catch (e) {
      falhas.push(`${e.name} ${url}`);
    }
  }
};

await Promise.all(Array.from({ length: SIMULTANEOS }, trabalhar));

if (falhas.length) {
  console.log(`[aquecer] ${falhas.length} de ${urls.length} não aqueceram:`);
  for (const f of falhas.slice(0, 15)) console.log(`  ${f}`);
  console.log('[aquecer] o site está no ar; estas variantes serão geradas sob demanda.');
} else {
  console.log(`[aquecer] todas as ${urls.length} variantes prontas.`);
}
