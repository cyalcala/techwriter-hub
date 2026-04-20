import { defineConfig, passthroughImageService } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server', // 🚀 Back to Server, but with a Shield.
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    runtime: { mode: 'compatibility' }
  }),
  integrations: [tailwind()],
  image: {
    service: passthroughImageService()
  }
});