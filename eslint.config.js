// Flat ESLint config (ESLint 9). Extends Expo's rules and disables any
// formatting rules that would conflict with Prettier.
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*'],
  },
];
