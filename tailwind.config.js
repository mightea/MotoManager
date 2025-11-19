/** @type {import('tailwindcss').Config} */
import formsPlugin from '@tailwindcss/forms';

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode accents
        primary: {
          DEFAULT: '#3b82f6', // blue-500
          dark: '#2563eb', // blue-600
          light: '#60a5fa', // blue-400
        },
        secondary: {
          DEFAULT: '#6b7280', // gray-500
        },
        background: '#ffffff', // white
        foreground: '#1f2937', // gray-900

        // Dark mode palette
        darkblue: {
          50: '#e0e7ff',
          100: '#c7d2fe',
          200: '#a5b4fc',
          300: '#818cf8',
          400: '#6366f1',
          500: '#4f46e5',
          600: '#4338ca',
          700: '#3730a3',
          800: '#312e81',
          900: '#2b2b6c', // A darker blue for primary background
          950: '#1b1b4d', // Even darker for deepest backgrounds
        },
      },
    },
  },
  plugins: [formsPlugin],
};
