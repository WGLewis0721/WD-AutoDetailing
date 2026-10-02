import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || 'https://mirror-finish-mobile-detailing.workers.dev';

export default defineConfig({
  site,
  output: 'static',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'auto' },
});
