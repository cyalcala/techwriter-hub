import { defineConfig, passthroughImageService } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static', // 🚀 PURE STATIC: NO WORKER, NO SSR, NO 500s.
  integrations: [tailwind()],
  image: {
    service: passthroughImageService()
  }
});