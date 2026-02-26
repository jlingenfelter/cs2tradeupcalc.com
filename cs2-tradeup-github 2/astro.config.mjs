import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://cs2tradeup.com',
  integrations: [sitemap()],
});
