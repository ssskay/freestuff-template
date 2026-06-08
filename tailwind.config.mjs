/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        dartmouth: {
          green: '#00693E',
        },
      },
    },
  },
  plugins: [],
};
