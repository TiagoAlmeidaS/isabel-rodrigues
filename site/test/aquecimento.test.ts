/**
 * O script de aquecimento repete, em JS puro, as regras de src/lib/imagem.ts.
 * Se as duas cópias divergirem ele aquece variantes que o site não pede — e
 * deixa frias as que pede, que é o problema que ele existe para resolver.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { LARGURAS, FORMATOS, urlImagem } from '../src/lib/imagem';

const script = readFileSync(new URL('../scripts/aquecer-cache.mjs', import.meta.url), 'utf8');

/** O literal atribuído a `const <nome>` dentro do script, como valor. */
const constanteDoScript = (nome: string) => {
  const marca = `const ${nome} = `;
  const inicio = script.indexOf(marca);

  expect(inicio, `não achei "const ${nome}" em aquecer-cache.mjs`).toBeGreaterThan(-1);

  const corpo = script.slice(inicio + marca.length);
  const fim = corpo.indexOf(";");
  // Aspas nas chaves para o JSON.parse aceitar o objeto literal do JS.
  const literal = corpo.slice(0, fim).replace(/(\w+):/g, '"$1":');

  return JSON.parse(literal) as unknown;
};

describe('script de aquecimento', () => {
  it('aquece exatamente as larguras que o site pede', () => {
    const doScript = constanteDoScript('LARGURAS');

    expect(doScript).toEqual([...LARGURAS]);
  });

  it('aquece exatamente os formatos e qualidades que o site pede', () => {
    const doScript = Object.entries(
      constanteDoScript('QUALIDADE') as Record<string, number>,
    );

    expect(doScript.map(([f]) => f).sort()).toEqual([...FORMATOS].sort());

    for (const [formato, q] of doScript) {
      const doSite = urlImagem('f.jpg', 1280, formato as (typeof FORMATOS)[number]);
      expect(doSite, `qualidade do ${formato} divergiu`).toContain(`quality(${q})`);
    }
  });

  it('não derruba o deploy quando uma variante falha', () => {
    // O site já está no ar quando o aquecimento roda; variante fria é
    // incômodo, não motivo para reverter a publicação.
    expect(script).not.toMatch(/process\.exit\(1\)/);
    expect(script).toContain('falhas.push');
  });

  it('desiste de uma variante em vez de pendurar o job', () => {
    expect(script).toContain('AbortSignal.timeout');
  });
});
