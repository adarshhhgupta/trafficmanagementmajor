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
        // Civic Warm Slate & Amber System
        'civic-base': '#151210',
        'civic-panel': '#1b1815',
        'civic-accent': '#242019',
        'civic-border': '#2d261e',
        'civic-border-subtle': '#383028',
        'civic-red': '#DC2626',
        'civic-amber': '#D97706',
        'civic-green': '#16A34A',
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
        fraunces: ['Fraunces', 'serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
