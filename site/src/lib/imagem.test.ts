import { describe, it, expect } from 'vitest';
import { LARGURAS, FORMATOS, chave, srcSet, urlImagem } from './imagem';

describe('larguras pedidas à CDN', () => {
  it('não pede 2000w', () => {
    // Regressão medida em produção: o encoder AVIF estourava os 30s da
    // Lambda a 2000w e a CDN devolvia 504 — cacheado, então a imagem
    // quebrava de vez. E 2000w estava no srcset, ou seja, telas grandes
    // pediam exatamente a variante quebrada.
    expect(LARGURAS).not.toContain(2000);
    expect(Math.max(...LARGURAS)).toBeLessThanOrEqual(1280);
  });

  it('mantém a escada de larguras em ordem crescente', () => {
    expect([...LARGURAS]).toEqual([...LARGURAS].sort((a, b) => a - b));
    expect(LARGURAS.length).toBeGreaterThanOrEqual(3);
  });

  it('o srcset só anuncia largura que o site pede', () => {
    const anunciadas = srcSet('foto.jpg', 'avif')
      .split(', ')
      .map((p) => Number(p.split(' ')[1].replace('w', '')));

    expect(anunciadas).toEqual([...LARGURAS]);
  });
});

describe('qualidade por formato', () => {
  const qualidadeDe = (formato: 'avif' | 'webp' | 'jpeg') =>
    Number(urlImagem('f.jpg', 1280, formato).match(/quality\((\d+)\)/)![1]);

  it('o AVIF pesa menos que o WebP, que é o motivo de existir', () => {
    // Medido em IMG_6067 a 1280w: AVIF q55 = 303 KB, WebP q78 = 429 KB,
    // AVIF q30 = 133 KB. A 55 a economia era de 30%; a 40 passa de 60%,
    // que é a ordem de ganho que justifica servir um terceiro formato.
    expect(qualidadeDe('avif')).toBeLessThan(qualidadeDe('webp'));
  });

  it('a qualidade fica em faixa utilizável', () => {
    for (const f of FORMATOS) {
      const q = qualidadeDe(f);
      expect(q).toBeGreaterThanOrEqual(30);
      expect(q).toBeLessThanOrEqual(90);
    }
  });
});

describe('redução da chave', () => {
  it('aceita a URL de pré-visualização que o painel grava', () => {
    expect(chave('https://isabelrodrigues.com.br/fit-in/1280x0/IMG_6064.JPG')).toBe(
      'IMG_6064.JPG',
    );
  });

  it('aceita a chave crua', () => {
    expect(chave('gestante/helena-03.jpg')).toBe('gestante/helena-03.jpg');
  });

  it('não empilha transformação sobre transformação', () => {
    const u = urlImagem('https://x.com/fit-in/1280x0/filters:format(webp)/a.jpg', 800, 'avif');

    expect(u.match(/fit-in/g)).toHaveLength(1);
    expect(u.match(/filters:format/g)).toHaveLength(1);
  });

  it('valor vazio não vira URL', () => {
    expect(chave('')).toBe('');
    expect(urlImagem('', 800, 'avif')).toBe('');
  });
});
