/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  // Keep Bootstrap / existing global styles intact
  corePlugins: {
    preflight: false,
  },
  content: [
    './src/**/*.{html,ts,scss}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#FF7F00',
          'orange-dark': '#E86F00',
          'orange-light': '#FF9E3D',
          teal: '#008B8B',
          'teal-dark': '#006E6E',
          'teal-light': '#2FB3B3',
          gold: '#FFC340',
          cream: '#FFF3D6',
        },
      },
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
        display: ['Baloo 2', 'Nunito', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(255,127,0,0.28)',
        'soft-teal': '0 10px 40px -12px rgba(0,139,139,0.28)',
        glow: '0 0 0 1px rgba(255,255,255,0.4), 0 20px 50px -12px rgba(255,127,0,0.45)',
        neu: '8px 8px 24px rgba(0,0,0,0.06), -8px -8px 24px rgba(255,255,255,0.9)',
      },
      keyframes: {
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(255,127,0,0.5)' },
          '70%': { boxShadow: '0 0 0 16px rgba(255,127,0,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(255,127,0,0)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
        pulseRing: 'pulseRing 2s infinite',
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
