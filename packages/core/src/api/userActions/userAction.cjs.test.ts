import { existsSync } from 'node:fs';
import { join } from 'node:path';

// The published packages have no "exports" field, so consumers can require a file inside dist
// directly. This module is the only one in the repository whose sole export is a default, which
// makes it the one place where a bundler can change the shape of a CommonJS namespace without any
// named export going missing. The build has to keep it as `exports.default`, not collapse it to
// `module.exports = UserAction`.
//
// The check needs built output, so it only runs after a build. Continuous integration always builds
// before testing.
const builtModulePath = join(__dirname, '../../../dist/cjs/api/userActions/userAction.js');
const isBuilt = existsSync(builtModulePath);

const describeWhenBuilt = isBuilt ? describe : describe.skip;

if (!isBuilt) {
  console.warn(`Skipping the CommonJS shape check because ${builtModulePath} does not exist. Run "yarn build" first.`);
}

describeWhenBuilt('built CommonJS shape', () => {
  const required = require(builtModulePath);

  it('exposes the class as a default export rather than as module.exports', () => {
    expect(typeof required).toBe('object');
    expect(typeof required.default).toBe('function');
    expect(required.default.name).toBe('UserAction');
  });

  it('marks the namespace as an ES module for interop', () => {
    expect(required.__esModule).toBe(true);
  });

  it('does not tag the namespace as a module, matching the previous compiler output', () => {
    expect(Object.prototype.toString.call(required)).toBe('[object Object]');
  });
});
