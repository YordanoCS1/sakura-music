/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        sakura: {
          50: '#fff0f5',
          100: '#ffe4ee',
          200: '#fecddf',
          300: '#fea3c5',
          400: '#fc6fa2',
          500: '#f43f82',
          600: '#e11d67',
          700: '#be0f4e',
          800: '#9d1042',
          900: '#83123b',
        }
      }
    },
  },
  plugins: [],
}
