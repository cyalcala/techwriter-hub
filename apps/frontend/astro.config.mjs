import { defineConfig, passthroughImageService } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
    runtime: { mode: 'compatibility' }
  }),
  integrations: [tailwind()],
  image: {
    service: passthroughImageService()
  },
  vite: {
    ssr: {
      // Bypassing noExternal to allow standard bundling
      noExternal: [],
      external: ['drizzle-orm']
    }
  }
});