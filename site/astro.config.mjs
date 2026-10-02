import { defineConfig } from 'astro/config';

const site = process.env.SITE_URL || 'https://wglewis0721.github.io/WD-AutoDetailing';

export default defineConfig({
  site,
  output: 'static',
  build: { inlineStylesheets: 'auto' },
});
