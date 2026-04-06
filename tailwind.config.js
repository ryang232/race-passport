/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1B2A4A',
        gold: '#C9A84C',
      },
      fontFamily: {
        bebas: ['"Bebas Neue"', 'sans-serif'],
        barlow: ['Barlow', 'sans-serif'],
        condensed: ['"Barlow Condensed"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
