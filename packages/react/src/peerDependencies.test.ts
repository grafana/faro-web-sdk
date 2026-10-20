import { satisfies, validRange } from 'semver';

import packageJson from '../package.json';

// The router compatibility matrix (see src/router/__matrix__) pins one fixture per
// supported React Router generation and runs a dedicated Jest project against each.
// Those fixtures are aliases with exact versions, so the matrix never resolves the
// peerDependencies ranges and cannot notice when a range stops covering a generation
// it tests. That gap let an automated dependency update rewrite the react-router peer
// range from "^7.12.0 || ^8.0.0" to "^7.18.2 ^7.18.2". A space means AND in semantic
// versioning, so the range stayed valid, collapsed to "^7.18.2" and silently dropped
// React Router v8, with every check still green.
//
// These tests close that gap: every generation the matrix tests must be admitted by a
// declared peer range.

const { devDependencies, peerDependencies } = packageJson;

/**
 * Reads the exact version out of a devDependency entry. Matrix fixtures are npm
 * aliases such as "npm:react-router@8.3.0"; the plain entries are exact versions.
 */
function fixtureVersion(name: keyof typeof devDependencies): string {
  const entry: string = devDependencies[name];
  const version = entry.startsWith('npm:') ? entry.slice(entry.lastIndexOf('@') + 1) : entry;

  if (!version) {
    throw new Error(`Could not read a version out of devDependency "${name}": "${entry}"`);
  }

  return version;
}

// Which peer range has to admit each matrix fixture.
//
// React Router v6 is the exception worth explaining. Its matrix project imports from
// "react-router", but consumers on that generation install "react-router-dom" v6,
// which depends on "react-router" v6 itself. The v6 fixture is therefore checked
// against the react-router-dom range. From v7 onwards react-router-dom was merged
// into react-router, so v7 and v8 are checked against the react-router range.
const matrix = [
  {
    description: 'React Router v5 (via react-router-dom)',
    fixture: 'react-router-dom-v5',
    peer: 'react-router-dom',
  },
  {
    description: 'React Router v6 (via react-router-dom)',
    fixture: 'react-router-v6',
    peer: 'react-router-dom',
  },
  {
    description: 'React Router v7',
    fixture: 'react-router',
    peer: 'react-router',
  },
  {
    description: 'React Router v8',
    fixture: 'react-router-v8',
    peer: 'react-router',
  },
] as const;

describe('peerDependencies', () => {
  it.each(Object.entries(peerDependencies))('declares %s as a valid semver range', (_name, range) => {
    expect(validRange(range)).not.toBeNull();
  });

  it.each(matrix)('covers the $description fixture in the $peer range', ({ fixture, peer }) => {
    const version = fixtureVersion(fixture);
    const range = peerDependencies[peer];

    expect(satisfies(version, range)).toBe(true);
  });

  // A space between two comparator sets means AND, which is almost never what a peer
  // range is meant to express and is how the v8 regression slipped through. Every
  // alternative in these ranges has to be separated by "||".
  it.each(Object.entries(peerDependencies))('separates every alternative in %s with "||"', (_name, range) => {
    const alternatives = range.split('||').map((alternative) => alternative.trim());

    for (const alternative of alternatives) {
      expect(alternative).not.toMatch(/\s/);
    }
  });
});
