import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwind from '@astrojs/tailwind';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: true },
    speedInsights: { enabled: true },
  }),
  integrations: [tailwind()],
  vite: {
    resolve: {
      alias: {
        '@va-hub/db': path.resolve(__dirname, '../../packages/db')
      }
    },
    ssr: {
      noExternal: ['@va-hub/db', '@libsql/client', 'drizzle-orm']
    }
  }
});