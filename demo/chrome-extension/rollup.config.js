const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const typescript = require('@rollup/plugin-typescript');

const entries = ['src/background.ts', 'src/content.ts', 'src/popup.ts'];

module.exports = entries.map((input) => ({
  input,
  output: {
    dir: 'dist',
    format: 'iife',
    entryFileNames: '[name].js',
    sourcemap: true,
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
}));
