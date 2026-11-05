/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#090B10',
          dark: '#111318',
          navy: '#172554',
          deepNavy: '#1E3A8A',
          white: '#FFFFFF',
          lightGrey: '#F3F4F6',
          mediumGrey: '#9CA3AF',
          darkGrey: '#374151',
          borderGrey: '#E5E7EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

