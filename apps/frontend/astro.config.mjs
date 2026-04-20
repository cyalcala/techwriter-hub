import { defineConfig, passthroughImageService } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  output: 'static', // 🚀 NUCLEAR OPTION: Static sites never return 500.
  integrations: [tailwind()],
  image: {
    service: passthroughImageService()
  }
});