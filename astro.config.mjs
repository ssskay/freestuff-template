import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import { SITE } from './src/site.config.ts';

export default defineConfig({
  integrations: [tailwind(), sitemap()],
  site: SITE.url,
  devToolbar: {
    enabled: false
  },
  // Note: Astro 5+ uses static output by default with hybrid behavior built-in
});
