/**
 * O config.yml é carregado pelo navegador dela: se algo nele estiver
 * malformado, o painel inteiro não abre — mostra só "Há um erro na
 * configuração do CMS" e ela fica sem conseguir publicar nada.
 *
 * Nenhum passo do CI olhava este arquivo. Foi assim que um `pattern` com
 * "Ex.: " no texto passou batido: o ": " abriu um mapa em YAML, o segundo
 * item virou objeto em vez de string, e o painel recusou a configuração.
 *
 * Estes testes varrem todos os campos, não só os que alguém lembrou de
 * conferir.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

type Campo = {
  name: string;
  widget?: string;
  pattern?: unknown;
  fields?: Campo[];
  field?: Campo;
  [k: string]: unknown;
};

const config = load(
  readFileSync(new URL('../public/admin/config.yml', import.meta.url), 'utf8'),
) as { collections: { name: string; files: { name: string; fields: Campo[] }[] }[] };

/** Todo campo do config, com o caminho legível até ele. */
function todosOsCampos(): { caminho: string; campo: Campo }[] {
  const achados: { caminho: string; campo: Campo }[] = [];

  const andar = (campos: Campo[], prefixo: string) => {
    for (const campo of campos) {
      const caminho = `${prefixo}.${campo.name}`;
      achados.push({ caminho, campo });
      if (campo.fields) andar(campo.fields, caminho);
      if (campo.field) andar([campo.field], caminho);
    }
  };

  for (const colecao of config.collections) {
    for (const arquivo of colecao.files ?? []) {
      andar(arquivo.fields, `${colecao.name}/${arquivo.name}`);
    }
  }

  return achados;
}

describe('config.yml do painel', () => {
  it('encontra os campos de todas as coleções', () => {
    // Se a varredura quebrar, os testes abaixo passam sem testar nada.
    const caminhos = todosOsCampos().map((c) => c.caminho);

    expect(caminhos).toContain('acervo/fotos.fotos.categoria');
    expect(caminhos).toContain('ensaios/categorias.categorias.slug');
    expect(caminhos).toContain('conteudo/contato.whatsapp');
    expect(caminhos.length).toBeGreaterThan(20);
  });

  it('todo pattern é um par de strings', () => {
    // Regressão: pattern[1] virou { "...Ex.": "colacao-de-grau" } porque
    // o texto tinha ": " e não estava entre aspas. O painel parou de abrir.
    const comPattern = todosOsCampos().filter(({ campo }) => campo.pattern !== undefined);

    expect(comPattern.length).toBeGreaterThan(0);

    for (const { caminho, campo } of comPattern) {
      expect(Array.isArray(campo.pattern), `${caminho}: pattern não é lista`).toBe(true);

      const [regex, mensagem] = campo.pattern as unknown[];

      expect(typeof regex, `${caminho}: pattern[0] não é string`).toBe('string');
      expect(
        typeof mensagem,
        `${caminho}: pattern[1] não é string — provável ": " sem aspas no YAML`,
      ).toBe('string');
    }
  });

  it('todo pattern compila como expressão regular', () => {
    for (const { caminho, campo } of todosOsCampos()) {
      if (campo.pattern === undefined) continue;
      const [regex] = campo.pattern as string[];

      expect(() => new RegExp(regex), `${caminho}: regex inválida`).not.toThrow();
    }
  });

  it('todo campo tem nome e todo campo de entrada tem widget', () => {
    for (const { caminho, campo } of todosOsCampos()) {
      expect(campo.name, `${caminho}: campo sem nome`).toBeTruthy();
      expect(
        campo.widget ?? campo.fields ?? campo.field,
        `${caminho}: campo sem widget`,
      ).toBeTruthy();
    }
  });

  it('todo relation aponta para uma coleção e arquivo que existem', () => {
    const relations = todosOsCampos().filter(({ campo }) => campo.widget === 'relation');

    expect(relations.length).toBeGreaterThan(0);

    for (const { caminho, campo } of relations) {
      const colecao = config.collections.find((c) => c.name === campo.collection);
      expect(colecao, `${caminho}: coleção "${campo.collection}" não existe`).toBeDefined();

      const arquivo = colecao!.files.find((f) => f.name === campo.file);
      expect(arquivo, `${caminho}: arquivo "${campo.file}" não existe`).toBeDefined();
    }
  });
});
