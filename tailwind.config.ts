import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{vue,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        moss: {
          50: '#f0f5ef',
          100: '#dce9d9',
          500: '#4f7d5f',
          700: '#315c43',
          900: '#183828',
        },
        clay: {
          100: '#f3e7d7',
          300: '#d7b98d',
          600: '#9b6a3f',
        },
      },
      fontFamily: {
        sans: ['"Avenir Next"', '"Source Sans 3"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 18px 50px rgba(33, 52, 38, 0.12)',
      },
    },
  },
  plugins: [],
} satisfies Config;
