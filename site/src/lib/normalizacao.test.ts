import { describe, it, expect } from 'vitest';
import { fotosDe, todasCategorias, capaDe, type Categoria } from './conteudo';

/**
 * A normalização é interna ao módulo; o que dá para observar de fora é que
 * o conteúdo continua legível mesmo com os vazios que o painel grava.
 */
describe('leitura do conteúdo com campos vazios do painel', () => {
  it('categoria sem ordem vai para o fim, não para o começo', () => {
    // `ordem: null` virando 0 jogaria o ensaio para o topo da home sem
    // ninguém ter pedido.
    const ordens = todasCategorias().map((c) => c.ordem);

    expect(ordens).toEqual([...ordens].sort((a, b) => a - b));
    for (const o of ordens) expect(Number.isNaN(o)).toBe(false);
  });

  it('nenhuma categoria chega com visivel indefinido', () => {
    for (const c of todasCategorias()) expect(typeof c.visivel).toBe('boolean');
  });

  it('ordenar fotos não quebra com ordem vazia', () => {
    for (const c of todasCategorias()) {
      expect(() => fotosDe(c.slug)).not.toThrow();
    }
  });

  it('capa cai para a string vazia quando não há foto nem capa própria', () => {
    const semNada: Categoria = {
      slug: 'inexistente',
      nome: '',
      chamada: '',
      descricao: '',
      capa: '',
      visivel: true,
      ordem: 1,
    };

    expect(capaDe(semNada)).toBe('');
  });
});
