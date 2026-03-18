/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#3b82f6',
          dark: '#0a0a0a',
          black: '#000000',
        },
      },
    },
  },
  plugins: [],
}
