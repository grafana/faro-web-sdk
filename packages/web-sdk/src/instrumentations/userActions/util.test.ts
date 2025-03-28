import { convertDataAttributeName } from './util';

describe('util', () => {
  it('converts data attribute to camelCase and remove the "data-" prefix', () => {
    expect(convertDataAttributeName('data-test-action-name')).toBe('testActionName');
  });
});
