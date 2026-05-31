import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1F2933',
        paper: '#F7F9FB',
        brand: '#2563EB',
        mint: '#0F766E',
        coral: '#E11D48',
      },
      boxShadow: {
        soft: '0 16px 50px rgba(31, 41, 51, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
