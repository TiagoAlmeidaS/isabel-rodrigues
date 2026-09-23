/**
 * O painel não omite campo opcional vazio: grava null em número e "" em
 * texto. Foi isso que derrubou o deploy quando a primeira foto entrou —
 * `astro check` reprovou "ordem": null contra `ordem?: number`, e todo
 * publish dela passou a falhar sem aviso nenhum.
 *
 * Estes testes fixam o formato real que o painel escreve.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

import { categoriasComSlugInvalido, type Categoria } from '../src/lib/conteudo';

const json = (caminho: string) =>
  JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));

const config = load(
  readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8'),
) as { collections: { name: string; files: { name: string; fields: any[] }[] }[] };

/** Um campo de dentro da lista de categorias, na aba Ensaios. */
const campoDaCategoria = (nome: string) => {
  const arquivo = config.collections
    .find((c) => c.name === 'ensaios')!
    .files.find((f) => f.name === 'categorias')!;
  const lista = arquivo.fields.find((f) => f.name === 'categorias')!;
  const campo = lista.fields.find((f: { name: string }) => f.name === nome);
  expect(campo, `campo "${nome}" sumiu da aba Ensaios`).toBeDefined();
  return campo;
};

describe('formato que o painel grava', () => {
  it('a foto de exemplo do acervo real passa pelos tipos', () => {
    // Regressão: este arquivo, exatamente como está, quebrava o build.
    const { fotos } = json('../src/data/fotos.json');

    for (const f of fotos) {
      expect(typeof f.arquivo).toBe('string');
      expect(typeof f.categoria).toBe('string');
    }
  });

  it('o painel recusa endereço com espaço, acento ou maiúscula', () => {
    // De propósito não afirma sobre os dados dela: slug ruim já gravado
    // não pode travar o CI e congelar o site. Quem barra os novos é o
    // pattern do painel; quem acusa os antigos é o aviso do build.
    const campo = campoDaCategoria('slug');
    const regra = new RegExp((campo.pattern as string[])[0]);

    expect(regra.test('colacao-de-grau')).toBe(true);
    expect(regra.test('gestante')).toBe(true);
    expect(regra.test('colação de grau')).toBe(false);
    expect(regra.test('Aniversario')).toBe(false);
    expect(regra.test('aniversário')).toBe(false);
    expect(regra.test('')).toBe(false);
  });

  it('a regra do painel é a mesma que o build cobra', () => {
    const campo = campoDaCategoria('slug');
    const doPainel = (campo.pattern as string[])[0];

    const ruim = { slug: 'colação de grau', nome: 'x' } as Categoria;
    const bom = { slug: 'colacao-de-grau', nome: 'y' } as Categoria;

    expect(new RegExp(doPainel).test(ruim.slug)).toBe(false);
    expect(categoriasComSlugInvalido([ruim, bom])).toEqual([ruim]);
  });
});
