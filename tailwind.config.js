/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      colors: {
        cream: {
          50:  '#FAF9F7',
          100: '#F5F3EF',
          200: '#EBEBEA',
          300: '#D5D2CB',
          400: '#7A7870',
          500: '#55534E',
          600: '#1C1C1A',
        },
        amber: {
          50:  '#FDF3E3',
          100: '#FFF8EC',
          200: '#F5D99A',
          300: '#E8A23C',
          400: '#8A5A00',
        },
        green: {
          50:  '#EAF4E8',
          400: '#2A6D2A',
        },
        danger: {
          50:  '#FDECEA',
          400: '#A33030',
        },
        info: {
          50:  '#EAF1FB',
          400: '#1A4F9E',
        },
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
