import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

import { chamadaMarca } from './conteudo';

describe('chamadaMarca', () => {
  it('vem do painel, não do código', () => {
    // Era texto fixo em quatro arquivos — rodapé, faixa do nome, descrição
    // do Google e título da aba — e ficou errado quando os ensaios dela
    // deixaram de ser só família.
    const { chamadaMarca: doJson } = JSON.parse(
      readFileSync(new URL('../data/textos.json', import.meta.url), 'utf8'),
    );

    expect(chamadaMarca).toBe(doJson);
  });

  it('nunca chega vazia aos componentes', () => {
    // Rodapé e faixa do nome renderizam isto direto. String vazia deixaria
    // um " · " solto ao lado da cidade.
    expect(chamadaMarca.trim().length).toBeGreaterThan(0);
  });
});
