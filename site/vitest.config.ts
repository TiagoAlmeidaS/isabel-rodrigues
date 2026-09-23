import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // src/lib/imagem.ts lê PUBLIC_IMG_BASE e, sem ela, devolve caminho cru
    // em vez de URL da CDN — o caminho de dev. Os testes precisam do
    // comportamento de produção, que é o que vai para o ar.
    env: { PUBLIC_IMG_BASE: 'https://cdn.exemplo.test' },
  },
});
