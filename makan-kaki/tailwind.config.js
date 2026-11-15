/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F8F9FA',
        orange: { DEFAULT: '#D96B27', dark: '#B85618', soft: '#FBEADF' },
        brown: { DEFAULT: '#3B2314', soft: '#6B5446', line: '#E7DFD9' },
        ok: { DEFAULT: '#4A7C59', soft: '#E3EFE6' },
        bad: { DEFAULT: '#B3261E', soft: '#F9E3E1' },
      },
      fontFamily: {
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(59,35,20,0.06), 0 4px 14px rgba(59,35,20,0.06)',
      },
    },
  },
  plugins: [],
}
