/** @type {import('tailwindcss').Config} */
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {
          colors: {
            'gray-900': '#121212',
            'gray-800': '#1e1e1e',
            'gray-700': '#2a2a2a',
            'gray-600': '#3a3a3a',
            'gray-400': '#9ca3af',
            'gray-300': '#d1d5db',
          }
        },
      },
      plugins: [],
    }
