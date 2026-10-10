/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F2EA',
        ink: '#151311',
        mute: '#6B655C',
        lime: { DEFAULT: '#C6F432', soft: '#E9FAA6' },
        coral: { DEFAULT: '#FF5A3C', deep: '#C42E15', soft: '#FFD9D1' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Figtree', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 3px 0 0 #151311',
        'pop-sm': '0 2px 0 0 #151311',
        soft: '0 14px 40px -18px rgba(21,19,15,.35)',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(28px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        pop: {
          '0%': { transform: 'scale(.95)' },
          '60%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-6px)' },
          '40%,80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'slide-in': 'slideIn .28s cubic-bezier(.2,.8,.2,1) both',
        'fade-up': 'fadeUp .4s cubic-bezier(.2,.8,.2,1) both',
        pop: 'pop .3s ease-out both',
        shake: 'shake .35s ease-in-out',
      },
    },
  },
  plugins: [],
};
