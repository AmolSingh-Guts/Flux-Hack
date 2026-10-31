/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#14243A',
          50: '#F5F7FB',
          100: '#E8EEF5',
          200: '#CBD5E1',
          300: '#94A3B8',
          400: '#64748B',
          500: '#334155',
          600: '#14243A',
          700: '#0F1B2D',
        },
        brand: {
          50: '#eff8ff',
          100: '#dbeefe',
          200: '#bfe2fe',
          300: '#93d0fd',
          400: '#60b5fa',
          500: '#3b99f6',
          600: '#257beb',
          700: '#1d63d8',
          800: '#1e51af',
          900: '#1e468a',
          950: '#172c54',
        },
      },
    },
  },
  plugins: [],
};
