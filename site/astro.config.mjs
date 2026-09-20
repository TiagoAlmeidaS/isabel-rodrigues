import { defineConfig } from 'astro/config';

export default defineConfig({
  site: process.env.SITE_URL ?? 'https://isabelrodrigues.com.br',
  // Estático puro: o build vira arquivos no S3, servidos pelo CloudFront.
  output: 'static',
  build: {
    // Uma pasta por rota, com index.html dentro — combina com a
    // CloudFront Function de URLs limpas (infra/modules/site-hosting).
    format: 'directory',
  },
  devToolbar: { enabled: false },
});
