/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cream / parchment app background (matches mockups)
        canvas: '#F7F2E7',
        paper: '#FFFCF5',
        ink: {
          900: '#0E0E0E',
          800: '#1A1A1A',
          700: '#2A2A2A',
          500: '#6B6B6B',
          400: '#9A9A9A',
          200: '#D9D6CD',
          100: '#EDEAE0',
        },
        brand: {
          red: '#D4321F', // sidebar active + alerts
          green: '#1F8A3D', // primary CTA
          greenDark: '#176B30',
          amber: '#D69A1B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,20,20,0.04), 0 0 0 1px rgba(20,20,20,0.06)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
