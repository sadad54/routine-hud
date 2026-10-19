/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        sage: '#33B679',
        blueberry: '#3F51B5',
        tangerine: '#F4511E',
        grape: '#8E24AA',
        tomato: '#D50000',
        banana: '#F6BF26',
        graphite: '#616161',
        lavender: '#7986CB',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
