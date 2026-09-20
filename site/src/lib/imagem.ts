/**
 * Monta as URLs do CloudFront. Contrato definido na prancheta "Fotos na AWS":
 *
 *   https://<dominio>/fit-in/<largura>x0/filters:format(avif)/<caminho>
 *
 * O formato VAI na URL, e quem escolhe é o navegador, por <picture>. A
 * alternativa — negociar pelo cabeçalho Accept — não serve aqui: a solução da
 * AWS só converte automaticamente para WebP (AUTO_WEBP + Accept), nunca para
 * AVIF. Com o formato explícito, o AVIF existe de verdade e some um ponto de
 * complexidade da CDN (nenhum cabeçalho na chave de cache).
 */

const BASE = (import.meta.env.PUBLIC_IMG_BASE ?? '').replace(/\/$/, '');

/** As únicas larguras que o site pede. Mudar isto multiplica transformações. */
export const LARGURAS = [400, 800, 1280, 2000] as const;

/** Do mais novo para o mais compatível: é a ordem que o <picture> respeita. */
export const FORMATOS = ['avif', 'webp', 'jpeg'] as const;

export type Formato = (typeof FORMATOS)[number];

export const TIPO_MIME: Record<Formato, string> = {
  avif: 'image/avif',
  webp: 'image/webp',
  jpeg: 'image/jpeg',
};

/** AVIF aguenta qualidade menor pelo mesmo resultado visual. */
const QUALIDADE: Record<Formato, number> = { avif: 55, webp: 78, jpeg: 82 };

/**
 * O painel pode gravar tanto a chave (`newborn/helena-03.jpg`) quanto a URL
 * pública completa, dependendo de como o media library estiver configurado.
 * Aceitamos as duas e reduzimos à chave.
 */
export function chave(valor: string): string {
  if (!valor) return '';

  let caminho = valor;
  if (/^https?:\/\//i.test(valor)) {
    try {
      caminho = new URL(valor).pathname;
    } catch {
      /* não era URL de verdade: segue como caminho */
    }
  }

  return caminho
    .replace(/^\//, '')
    // O painel grava a URL de pré-visualização, que já carrega a
    // transformação. Sem tirar isto, viraria /fit-in/960x0/fit-in/1280x0/...
    .replace(/^fit-in\/\d+x\d+\//, '')
    .replace(/^(filters:[^/]+\/)+/, '');
}

export function urlImagem(valor: string, largura: number, formato?: Formato): string {
  const k = chave(valor);
  if (!k) return '';
  if (!BASE) {
    // Em dev, sem CDN configurada, deixa o caminho cru — o alt e a cor de
    // fundo seguram o layout sem quebrar a build.
    return `/${k}`;
  }

  const filtros = formato
    ? `/filters:format(${formato})/filters:quality(${QUALIDADE[formato]})`
    : '';

  return `${BASE}/fit-in/${largura}x0${filtros}/${k}`;
}

export function srcSet(
  valor: string,
  formato?: Formato,
  larguras: readonly number[] = LARGURAS,
): string {
  return larguras.map((l) => `${urlImagem(valor, l, formato)} ${l}w`).join(', ');
}
