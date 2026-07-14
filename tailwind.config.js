/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef7ee',
          100: '#fdedd3',
          200: '#fbd7a5',
          300: '#f8b86d',
          400: '#f49035',
          500: '#f27314',
          600: '#e3570c',
          700: '#bc420b',
          800: '#963610',
          900: '#792f10',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        warm: {
          50: '#fdfcfb',
          100: '#faf6f3',
          200: '#f5ede7',
          300: '#eadfdf',
          400: '#decfc4',
          500: '#d4bdad',
        },
      },
    },
  },
  plugins: [],
}
