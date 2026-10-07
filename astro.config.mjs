// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://aliya-guesthouse.pages.dev',
	integrations: [sitemap()],
});
