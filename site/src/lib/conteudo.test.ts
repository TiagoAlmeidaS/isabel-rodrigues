import { describe, it, expect } from 'vitest';
import { fotosOrfas, type Categoria, type Foto } from './conteudo';

const categoria = (slug: string): Categoria => ({
  slug,
  nome: slug,
  chamada: '',
  descricao: '',
  capa: '',
  visivel: true,
  ordem: 1,
});

const foto = (arquivo: string, categoria: string): Foto => ({
  arquivo,
  categoria,
  descricao: '',
});

describe('fotosOrfas', () => {
  it('não acusa nada quando toda foto tem o seu ensaio', () => {
    const orfas = fotosOrfas(
      [foto('a.jpg', 'gestante'), foto('b.jpg', 'newborn')],
      [categoria('gestante'), categoria('newborn')],
    );

    expect(orfas.size).toBe(0);
  });

  it('pega as fotos deixadas para trás quando o endereço do ensaio muda', () => {
    // Era 'smash-the-cake', virou 'smash'. As fotos continuam no antigo.
    const orfas = fotosOrfas(
      [foto('bolo1.jpg', 'smash-the-cake'), foto('bolo2.jpg', 'smash-the-cake')],
      [categoria('smash')],
    );

    expect([...orfas.keys()]).toEqual(['smash-the-cake']);
    expect(orfas.get('smash-the-cake')?.map((f) => f.arquivo)).toEqual([
      'bolo1.jpg',
      'bolo2.jpg',
    ]);
  });

  it('pega as fotos de um ensaio removido do painel', () => {
    const orfas = fotosOrfas([foto('a.jpg', 'ensaio-apagado')], [categoria('gestante')]);

    expect(orfas.get('ensaio-apagado')).toHaveLength(1);
  });

  it('agrupa por slug órfão, sem misturar as fotos que estão certas', () => {
    const orfas = fotosOrfas(
      [
        foto('ok.jpg', 'gestante'),
        foto('x.jpg', 'sumiu'),
        foto('y.jpg', 'sumiu-tambem'),
        foto('z.jpg', 'sumiu'),
      ],
      [categoria('gestante')],
    );

    expect(orfas.size).toBe(2);
    expect(orfas.get('sumiu')).toHaveLength(2);
    expect(orfas.get('sumiu-tambem')).toHaveLength(1);
  });

  it('não reclama de acervo vazio nem de site sem categorias', () => {
    expect(fotosOrfas([], [categoria('gestante')]).size).toBe(0);
    expect(fotosOrfas([], []).size).toBe(0);
  });

  it('acusa tudo quando não há categoria nenhuma e há fotos', () => {
    expect(fotosOrfas([foto('a.jpg', 'gestante')], []).size).toBe(1);
  });

  it('lê o acervo de verdade sem quebrar', () => {
    // De propósito não afirma que o acervo está limpo: o conteúdo vem do
    // painel, e uma foto órfã não pode derrubar o CI e travar a
    // publicação dela. Quem acusa isso é o aviso no log do build.
    expect(() => fotosOrfas()).not.toThrow();
  });
});
