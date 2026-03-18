/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        oat: {
          50: '#FDFBF7',
          100: '#F5F2E9',
          200: '#E8E2D2',
        },
        blueberry: {
          50: '#E8EAF6',
          100: '#C5CAE9',
          400: '#5C6BC0',
          500: '#3F51B5',
          600: '#3949AB',
          800: '#283593',
          900: '#1A237E',
        },
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
