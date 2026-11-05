#!/usr/bin/env node
 
// Command line entry point for the rules module, for customers and CI.
//
//   faro-sampling validate <rules.json>   parse the document; print warnings; exit 1 on an error
//   faro-sampling hash <rules.json>       print the rulesHash the SDK will stamp on verdicts
//
// Runs the built package (dist/cjs), so `yarn build` first in the monorepo.

const { readFileSync } = require('node:fs');

const { parse, RuleDocumentError } = require('../dist/cjs/index.js');

function usage(code) {
  console.error('usage: faro-sampling <validate|hash> <rules.json>');
  process.exit(code);
}

function load(path) {
  let text;
  try {
    text = path === '-' ? readFileSync(0, 'utf8') : readFileSync(path, 'utf8');
  } catch (err) {
    console.error(`cannot read ${path}: ${err.message}`);
    process.exit(2);
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(`${path} is not valid JSON: ${err.message}`);
    process.exit(1);
  }
}

const [command, path] = process.argv.slice(2);
if (!command || !path || !['validate', 'hash'].includes(command)) {
  usage(command === '--help' || command === '-h' ? 0 : 2);
}

let parsed;
try {
  parsed = parse(load(path));
} catch (err) {
  if (err instanceof RuleDocumentError) {
    console.error(`invalid: ${err.message}`);
    process.exit(1);
  }
  throw err;
}

if (command === 'hash') {
  console.log(parsed.rulesHash);
} else {
  for (const w of parsed.warnings) {
    console.error(`warning: ${w}`);
  }
  const kinds = parsed.rules.reduce((acc, r) => ((acc[r.kind] = (acc[r.kind] ?? 0) + 1), acc), {});
  console.log(
    `valid: ${parsed.rules.length} rules (${kinds.exclusion ?? 0} drop, ${kinds.base_rate ?? 0} base rate, ${kinds.trigger ?? 0} trigger), rulesHash ${parsed.rulesHash}`
  );
}
