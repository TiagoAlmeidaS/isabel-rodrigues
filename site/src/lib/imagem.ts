/**
 * Monta as URLs do CloudFront. Contrato definido na prancheta "Fotos na AWS":
 *
 *   https://<dominio>/fit-in/<largura>x0/<caminho-no-bucket>
 *
 * O formato NÃO vai na URL — uma CloudFront Function lê o Accept do navegador
 * e devolve AVIF, WebP ou JPEG. Por isso aqui só existe largura.
 */

const BASE = (import.meta.env.PUBLIC_IMG_BASE ?? '').replace(/\/$/, '');

/** As únicas larguras que o site pede. Mudar isto multiplica transformações. */
export const LARGURAS = [400, 800, 1280, 2000] as const;

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
    .replace(/^fit-in\/\d+x\d+\//, '');
}

export function urlImagem(valor: string, largura: number): string {
  const k = chave(valor);
  if (!k) return '';
  if (!BASE) {
    // Em dev, sem CDN configurada, deixa o caminho cru — o alt e a cor de
    // fundo seguram o layout sem quebrar a build.
    return `/${k}`;
  }
  return `${BASE}/fit-in/${largura}x0/${k}`;
}

export function srcSet(valor: string, larguras: readonly number[] = LARGURAS): string {
  return larguras.map((l) => `${urlImagem(valor, l)} ${l}w`).join(', ');
}
