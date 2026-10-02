import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://wglewis0721.github.io/WD-AutoDetailing';

export default defineConfig({
  site,
  output: 'static',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
});
