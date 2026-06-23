// Single source of truth for the app's color palette.
// Consumed by tailwind.config.js (build time) AND React Native code (runtime),
// so brand colors are defined exactly once. Written as CommonJS so the
// Tailwind config can `require()` it; typed via theme.d.ts for app code.
const colors = {
  brand: {
    DEFAULT: '#FF4D6D',
    dark: '#C9184A',
    light: '#FFB3C1',
  },
  ink: '#1A1A1A',
  muted: '#6B7280',
};

module.exports = { colors };
