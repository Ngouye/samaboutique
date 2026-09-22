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
          50: '#f2f6f1',
          100: '#e1ebe0',
          200: '#c4d6c1',
          300: '#9ebc99',
          400: '#749c6d',
          500: '#527d4a',
          600: '#3F5C3B',
          700: '#344a31',
          800: '#2c3b2a',
          900: '#253123',
          950: '#151d14',
        }
      }
    },
  },
  plugins: [],
}
