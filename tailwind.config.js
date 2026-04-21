/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0b0f1a',
          secondary: '#131a2a',
          tertiary: '#1c2438',
        },
        border: {
          DEFAULT: '#2a3349',
        },
        accent: {
          DEFAULT: '#5b8def',
          hover: '#7aa1f5',
        },
        tier: {
          common: '#9ca3af',
          rare: '#3b82f6',
          epic: '#a855f7',
          legendary: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
};
