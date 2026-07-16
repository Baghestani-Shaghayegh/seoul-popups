// Single source of truth for the app's color palette.
// Consumed by tailwind.config.js (build time) AND React Native code (runtime),
// so brand colors are defined exactly once. Written as CommonJS so the
// Tailwind config can `require()` it; typed via theme.d.ts for app code.
//
// Palette from the "mgn radar" redesign (app for sara/mgn-radar.html).
// Role rule: pink = navigation + actions + accents; purple = "your plan /
// your day" (hero, selected day, selected filter).
const colors = {
  brand: {
    DEFAULT: '#EE5D8C', // primary pink
    dark: '#C43C6B',
    light: '#FDE1EC', // soft pink tint
  },
  purple: {
    DEFAULT: '#6A4BD1', // "your plan / your day"
    light: '#ECE7FE', // lavender fill
  },
  bg: '#FAF6F3', // warm app background
  surface: '#FFFFFF',
  well: '#F4EEF3', // inset fills (fact pills, map cards)
  ink: '#2B2532',
  muted: '#7C7488',
  faint: '#ABA2B4',
  line: {
    DEFAULT: '#F0EAEF',
    strong: '#E7DEE8',
  },
  peach: {
    DEFAULT: '#FFE6D6',
    ink: '#D97A3D', // countdown text when not urgent
  },
};

module.exports = { colors };
