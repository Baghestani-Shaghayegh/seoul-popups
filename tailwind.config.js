const { colors } = require('./src/constants/theme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan the route directory and all shared source files for class names.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // Palette is the single source of truth in src/constants/theme.js.
      colors,
    },
  },
  plugins: [],
};
