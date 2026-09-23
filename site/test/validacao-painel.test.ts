/**
 * O módulo que avisa dentro do painel. Ele roda no navegador dela, fora do
 * build do site, então nada além destes testes olha para ele.
 */
import { describe, it, expect, vi } from 'vitest';

// @ts-expect-error — módulo JS servido ao painel, sem tipos
import { avaliarSave, fotosOrfas, nomeCurto } from '../public/admin/validacao.mjs';

const cat = (slug: string) => ({ slug, nome: slug });
const foto = (arquivo: string, categoria: string) => ({ arquivo, categoria });

const CAMINHO_FOTOS = 'site/src/data/fotos.json';
const CAMINHO_CATEGORIAS = 'site/src/data/categorias.json';

/** Devolve sempre o mesmo conteúdo, como se viesse do repositório. */
const repo = (conteudo: Record<string, unknown>) => vi.fn(async () => conteudo);

describe('detecção de órfãs', () => {
  it('não acusa quando todo ensaio existe', () => {
    expect(fotosOrfas([foto('a.jpg', 'gestante')], [cat('gestante')]).size).toBe(0);
  });

  it('agrupa pelo endereço que sumiu', () => {
    const r = fotosOrfas(
      [foto('a.jpg', 'sumiu'), foto('b.jpg', 'sumiu'), foto('c.jpg', 'gestante')],
      [cat('gestante')],
    );

    expect(r.size).toBe(1);
    expect(r.get('sumiu')).toHaveLength(2);
  });

  it('ignora foto sem ensaio em vez de inventar um grupo vazio', () => {
    expect(fotosOrfas([{ arquivo: 'a.jpg' }], [cat('gestante')]).size).toBe(0);
  });
});

describe('nome legível do arquivo', () => {
  it('tira a URL e a transformação da CDN', () => {
    expect(nomeCurto('https://x.com/fit-in/1280x0/IMG_6064.JPG')).toBe('IMG_6064.JPG');
  });

  it('aguenta valor vazio', () => {
    expect(nomeCurto('')).toBe('foto sem arquivo');
  });
});

describe('salvando FOTOS', () => {
  it('deixa passar quando todas apontam para ensaio existente', async () => {
    const r = await avaliarSave({
      caminho: CAMINHO_FOTOS,
      dados: { fotos: [foto('a.jpg', 'gestante')] },
      buscar: repo({ categorias: [cat('gestante')] }),
      perguntar: () => true,
    });

    expect(r).toBeNull();
  });

  it('barra e diz qual foto e qual ensaio', async () => {
    const r = await avaliarSave({
      caminho: CAMINHO_FOTOS,
      dados: { fotos: [foto('https://x/fit-in/400x0/IMG_6064.JPG', 'familia')] },
      buscar: repo({ categorias: [cat('gestante')] }),
      perguntar: () => true,
    });

    expect(r).toBeInstanceOf(Error);
    // A forma que o painel exibe como diálogo, em vez de erro genérico.
    expect((r as Error).message).toBe('saving_failed');
    expect((r as Error).cause).toBeInstanceOf(Error);

    const texto = ((r as Error).cause as Error).message;

    expect(texto).toContain('familia');
    expect(texto).toContain('IMG_6064.JPG');
  });

  it('não pergunta nada: aqui não há escolha a fazer', async () => {
    const perguntar = vi.fn(() => true);

    await avaliarSave({
      caminho: CAMINHO_FOTOS,
      dados: { fotos: [foto('a.jpg', 'familia')] },
      buscar: repo({ categorias: [cat('gestante')] }),
      perguntar,
    });

    expect(perguntar).not.toHaveBeenCalled();
  });
});

describe('salvando ENSAIOS', () => {
  const renomeando = {
    caminho: CAMINHO_CATEGORIAS,
    dados: { categorias: [cat('colacao-de-grau')] },
    buscar: repo({ fotos: [foto('a.jpg', 'colação de grau')] }),
  };

  it('deixa passar quando nenhuma foto fica para trás', async () => {
    const r = await avaliarSave({
      caminho: CAMINHO_CATEGORIAS,
      dados: { categorias: [cat('gestante')] },
      buscar: repo({ fotos: [foto('a.jpg', 'gestante')] }),
      perguntar: () => false,
    });

    expect(r).toBeNull();
  });

  it('pergunta antes de deixar fotos para trás, em vez de barrar', async () => {
    // Renomear pode ser exatamente o que ela quer; o aviso existe para ela
    // saber o preço, não para impedir.
    const perguntar = vi.fn(() => true);
    const r = await avaliarSave({ ...renomeando, perguntar });

    expect(perguntar).toHaveBeenCalledOnce();
    expect(perguntar.mock.calls[0][0]).toContain('colação de grau');
    expect(r).toBeNull();
  });

  it('respeita o não e não salva', async () => {
    const r = await avaliarSave({ ...renomeando, perguntar: () => false });

    expect(r).toBeInstanceOf(Error);
    expect(((r as Error).cause as Error).message).toContain('Nada foi salvo');
  });
});

describe('arquivos que não são dele', () => {
  it('não mexe em textos.json nem consulta o repositório', async () => {
    const buscar = vi.fn();
    const r = await avaliarSave({
      caminho: 'site/src/data/textos.json',
      dados: { retrato: '' },
      buscar,
      perguntar: () => true,
    });

    expect(r).toBeNull();
    expect(buscar).not.toHaveBeenCalled();
  });
});

describe('registro no CMS', () => {
  /** Um CMS de mentira que guarda o handler para podermos chamá-lo. */
  const cmsFalso = () => {
    const registrados: any[] = [];

    return {
      cms: { registerEventListener: (h: any) => registrados.push(h) },
      handler: () => registrados[0].handler,
      registrados,
    };
  };

  /** Entrada no formato Immutable que o Sveltia entrega ao hook. */
  const entrada = (caminho: string, dados: unknown) => ({
    entry: {
      get: (k: string) => (k === 'path' ? caminho : { toJS: () => dados }),
    },
  });

  it('registra um único listener de preSave', async () => {
    const { cms, registrados } = cmsFalso();
    const { registrar } = await import('../public/admin/validacao.mjs');

    registrar(cms, { buscar: repo({}), perguntar: () => true });

    expect(registrados).toHaveLength(1);
    expect(registrados[0].name).toBe('preSave');
  });

  it('deixa salvar quando a consulta ao repositório falha', async () => {
    // O caso que mais importa: sem rede, com o GitHub fora do ar ou com o
    // JSON em formato inesperado, ela ainda consegue publicar. Um aviso
    // que não rodou não pode virar painel travado.
    const { cms, handler } = cmsFalso();
    const { registrar } = await import('../public/admin/validacao.mjs');
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {});

    registrar(cms, {
      buscar: vi.fn(async () => {
        throw new Error('rede caiu');
      }),
      perguntar: () => true,
    });

    await expect(
      handler()(entrada(CAMINHO_FOTOS, { fotos: [foto('a.jpg', 'familia')] })),
    ).resolves.toBeUndefined();

    expect(aviso).toHaveBeenCalled();
    aviso.mockRestore();
  });

  it('lança o erro quando há de fato um problema', async () => {
    const { cms, handler } = cmsFalso();
    const { registrar } = await import('../public/admin/validacao.mjs');

    registrar(cms, {
      buscar: repo({ categorias: [cat('gestante')] }),
      perguntar: () => true,
    });

    await expect(
      handler()(entrada(CAMINHO_FOTOS, { fotos: [foto('a.jpg', 'familia')] })),
    ).rejects.toThrow('saving_failed');
  });

  it('deixa passar o save que está em ordem', async () => {
    const { cms, handler } = cmsFalso();
    const { registrar } = await import('../public/admin/validacao.mjs');

    registrar(cms, {
      buscar: repo({ categorias: [cat('gestante')] }),
      perguntar: () => true,
    });

    await expect(
      handler()(entrada(CAMINHO_FOTOS, { fotos: [foto('a.jpg', 'gestante')] })),
    ).resolves.toBeUndefined();
  });
});
