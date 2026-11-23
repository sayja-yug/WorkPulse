// Shared scales also theme existing screens that use the original utility names.
const neutral = {
  50: '#f8f7f2', 100: '#f0f1e9', 200: '#e1e5da', 300: '#cbd4c6',
  400: '#9fae9e', 500: '#637568', 600: '#506457', 700: '#3c5345',
  800: '#304d3e', 900: '#234535', 950: '#163b2c',
};
const sage = {
  50: '#f1f6ef', 100: '#e2eddf', 200: '#cbdcc8', 300: '#adc6a9',
  400: '#83a987', 500: '#648d6d', 600: '#467553', 700: '#345f43',
  800: '#294f37', 900: '#21422f', 950: '#153222',
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      xs: '360px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        mono: neutral,
        zinc: neutral,
        slate: neutral,
        gray: neutral,
        brand: sage,
        indigo: sage,
        violet: sage,
        purple: sage,
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }], // 10px
        xs: ['0.75rem', { lineHeight: '1rem' }],        // 12px
        sm: ['0.875rem', { lineHeight: '1.25rem' }],    // 14px
        base: ['1rem', { lineHeight: '1.5rem' }],       // 16px
        lg: ['1.125rem', { lineHeight: '1.75rem' }],    // 18px
        xl: ['1.25rem', { lineHeight: '1.75rem' }],     // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],      // 24px
        '3xl': ['2rem', { lineHeight: '2.5rem' }],       // 32px
        '4xl': ['2.5rem', { lineHeight: '3rem' }],      // 40px
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'popover': '0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
