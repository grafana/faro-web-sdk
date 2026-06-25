/**
 * Compiles transportWorker.ts into a self-contained JS string and writes it
 * to workerScript.generated.ts, which is imported by workerScript.ts.
 *
 * Run: node scripts/build-worker.mjs
 */

import { rollup } from 'rollup';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(__dirname, '..');
const workerEntry = join(pkgDir, 'src/transports/fetch/transportWorker.ts');
const outputFile = join(pkgDir, 'src/transports/fetch/workerScript.generated.ts');

async function build() {
  const bundle = await rollup({
    input: workerEntry,
    plugins: [
      resolve({ browser: true }),
      typescript({
        tsconfig: false,
        include: [workerEntry],
        compilerOptions: {
          target: 'ES2017',
          module: 'ES2015',
          moduleResolution: 'bundler',
          strict: true,
          lib: ['ES2017', 'WebWorker'],
          declaration: false,
          sourceMap: false,
          skipLibCheck: true,
        },
      }),
      terser({
        compress: { ecma: 2017 },
        format: { ecma: 2017 },
      }),
    ],
  });

  const { output } = await bundle.generate({
    format: 'iife',
    name: '__faroWorker',
  });

  const code = output[0].code.trim();
  const escaped = code.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  const generated = [
    '// AUTO-GENERATED — do not edit.',
    '// Source: transportWorker.ts',
    '// Regenerate: node scripts/build-worker.mjs (or yarn build:worker)',
    '',
    'export function getWorkerScript(): string {',
    '  return `' + escaped + '`;',
    '}',
    '',
  ].join('\n');

  writeFileSync(outputFile, generated, 'utf-8');
  console.log(`Worker script written to ${outputFile}`);
}

build().catch((err) => {
  console.error('Failed to build worker script:', err);
  process.exit(1);
});
