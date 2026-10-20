/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
      colors: {
        paper: '#F4F7F8',
        ink: '#10222B',
        tide: { 50: '#ECF8F6', 100: '#CFEFEA', 400: '#2DB5A5', 500: '#14958A', 600: '#0F766E', 700: '#115E59' },
        ember: { 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
        deep: { 800: '#0F1E26', 850: '#13262F', 900: '#0B161C' },
      },
      keyframes: {
        flicker: { '0%,100%': { transform: 'scale(1) rotate(-2deg)' }, '50%': { transform: 'scale(1.12) rotate(2deg)' } },
      },
      animation: { flicker: 'flicker 1.4s ease-in-out infinite' },
    },
  },
  plugins: [],
}
