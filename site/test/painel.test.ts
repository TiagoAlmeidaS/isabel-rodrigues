/**
 * O painel e o site leem os mesmos arquivos, mas por caminhos diferentes:
 * o site importa os JSON, o painel segue o config.yml. Estes testes
 * seguram o ponto onde os dois precisam concordar — o campo "Ensaio" da
 * aba Fotos, que já foi uma lista fixa e por isso ignorava as categorias
 * criadas na aba Ensaios.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

import categoriasJson from '../src/data/categorias.json';

type Campo = { name: string; fields?: Campo[]; [k: string]: unknown };
type Arquivo = { name: string; file: string; fields: Campo[] };
type Colecao = { name: string; files: Arquivo[] };

const config = load(readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8')) as {
  collections: Colecao[];
};

const colecao = (nome: string) => {
  const achada = config.collections.find((c) => c.name === nome);
  expect(achada, `coleção "${nome}" sumiu do config.yml`).toBeDefined();
  return achada!;
};

const arquivo = (nomeColecao: string, nomeArquivo: string) => {
  const achado = colecao(nomeColecao).files.find((f) => f.name === nomeArquivo);
  expect(achado, `arquivo "${nomeArquivo}" sumiu de "${nomeColecao}"`).toBeDefined();
  return achado!;
};

const campoEnsaio = () => {
  const lista = arquivo('acervo', 'fotos').fields.find((f) => f.name === 'fotos')!;
  const campo = lista.fields!.find((f) => f.name === 'categoria');
  expect(campo, 'campo "categoria" sumiu da aba Fotos').toBeDefined();
  return campo!;
};

describe('campo Ensaio da aba Fotos', () => {
  it('não usa lista fixa de opções', () => {
    // A regressão original: `widget: select` com os slugs escritos à mão.
    // Categoria nova em Ensaios não aparecia aqui, e não havia como
    // marcar nenhuma foto para ela.
    const campo = campoEnsaio();

    expect(campo.widget).not.toBe('select');
    expect(campo.options).toBeUndefined();
  });

  it('lê as opções da coleção Ensaios', () => {
    const campo = campoEnsaio();

    expect(campo.widget).toBe('relation');
    expect(campo.collection).toBe('ensaios');
    expect(campo.file).toBe('categorias');
  });

  it('aponta para a coleção e o arquivo que existem de fato', () => {
    const campo = campoEnsaio();
    const alvo = arquivo(campo.collection as string, campo.file as string);

    expect(alvo.file).toBe('site/src/data/categorias.json');
  });

  it('grava o slug e mostra o nome', () => {
    // O site casa foto com ensaio por slug (conteudo.ts, fotosDe). Se o
    // relation gravasse o nome, toda galeria ficaria vazia.
    const campo = campoEnsaio();

    expect(campo.value_field).toBe('categorias.*.slug');
    expect(campo.display_fields).toEqual(['categorias.*.nome']);
  });

  it('os caminhos do relation batem com o formato de categorias.json', () => {
    // 'categorias.*.slug' só resolve se o JSON for { categorias: [...] }
    // com slug e nome em cada item.
    expect(Array.isArray(categoriasJson.categorias)).toBe(true);
    expect(categoriasJson.categorias.length).toBeGreaterThan(0);

    for (const c of categoriasJson.categorias) {
      expect(typeof c.slug).toBe('string');
      expect(typeof c.nome).toBe('string');
    }
  });

  it('o campo que alimenta o relation é o mesmo editado na aba Ensaios', () => {
    const lista = arquivo('ensaios', 'categorias').fields.find((f) => f.name === 'categorias')!;
    const nomes = lista.fields!.map((f) => f.name);

    expect(nomes).toContain('slug');
    expect(nomes).toContain('nome');
  });
});
