/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'tcc-bg': '#0B0C10',
        'tcc-panel': '#1F2833',
        'tcc-accent': '#66FCF1',
        'tcc-secondary': '#45A29E',
        'tcc-text': '#C5C6C7',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
