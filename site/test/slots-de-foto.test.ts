/**
 * Todo lugar onde o site mostra uma foto tem que ser escolhível no painel.
 * Três não eram: o retrato do "Sobre" (fixo e vazio no código, sempre o
 * cartaz "[ FOTO ]"), a foto de abertura (era a capa do primeiro ensaio,
 * sem ela poder dizer nada) e a faixa "Ensaios recentes" (o site escolhia
 * sozinho). Estes testes seguram os três.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';

const leia = (caminho: string) => readFileSync(new URL(caminho, import.meta.url), 'utf8');

const config = load(leia('../public/admin/config.yml')) as any;

const campos = (colecao: string, arquivo: string) =>
  config.collections.find((c: any) => c.name === colecao).files.find((f: any) => f.name === arquivo)
    .fields;

const campoDeTextos = (nome: string) =>
  campos('conteudo', 'textos').find((f: any) => f.name === nome);

const campoDeFoto = (nome: string) =>
  campos('acervo', 'fotos')
    .find((f: any) => f.name === 'fotos')
    .fields.find((f: any) => f.name === nome);

describe('slots de foto da home', () => {
  it('o retrato do "Sobre" é escolhível', () => {
    const campo = campoDeTextos('retrato');

    expect(campo, 'campo "retrato" sumiu do painel').toBeDefined();
    expect(campo.widget).toBe('image');
    // Opcional de propósito: enquanto ela não tiver um retrato, o site
    // mostra o espaço reservado em vez de quebrar.
    expect(campo.required).toBe(false);
  });

  it('a foto de abertura é escolhível', () => {
    const campo = campoDeTextos('fotoAbertura');

    expect(campo, 'campo "fotoAbertura" sumiu do painel').toBeDefined();
    expect(campo.widget).toBe('image');
    expect(campo.required).toBe(false);
  });

  it('a faixa "Ensaios recentes" é escolhível foto a foto', () => {
    const campo = campoDeFoto('destaque');

    expect(campo, 'campo "destaque" sumiu da aba Fotos').toBeDefined();
    expect(campo.widget).toBe('boolean');
    expect(campo.default).toBe(false);
  });

  it('cada slot diz onde aparece no site', () => {
    // Um campo de imagem sem explicação não resolve nada: ela precisa
    // saber qual pedaço da tela vai mudar.
    for (const nome of ['retrato', 'fotoAbertura']) {
      expect(campoDeTextos(nome).hint, `"${nome}" sem hint`).toBeTruthy();
    }

    for (const nome of ['capa', 'destaque']) {
      expect(campoDeFoto(nome).hint, `"${nome}" sem hint`).toBeTruthy();
    }
  });

  it('existem no JSON que o painel edita', () => {
    const textos = JSON.parse(leia('../src/data/textos.json'));

    expect(textos).toHaveProperty('retrato');
    expect(textos).toHaveProperty('fotoAbertura');
  });
});

describe('nenhuma foto fica fora do painel', () => {
  it('a home não tem mais caminho de imagem escrito no código', () => {
    const pagina = leia('../src/pages/index.astro');
    const slots = [...pagina.matchAll(/arquivo=\{?([^}\n]*)\}?/g)].map((m) => m[1].trim());

    expect(slots.length).toBeGreaterThan(0);

    for (const valor of slots) {
      // Regressão: o retrato era literalmente `arquivo=""`, um slot que
      // nenhuma edição no painel alcançava.
      expect(valor, `slot com valor fixo: ${valor}`).not.toBe('""');
      expect(valor).not.toMatch(/^"[^"]+"$/);
    }
  });
});
