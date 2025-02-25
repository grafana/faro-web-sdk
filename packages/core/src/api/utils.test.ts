import type { Patterns } from '..';

import { shouldIgnoreEvent } from './utils';

describe('api/utils', () => {
  it('should ignore event', () => {
    let patterns: Patterns = ['pattern1', 'pattern2'];
    let msg = 'message pattern1';
    let result = shouldIgnoreEvent(patterns, msg);
    expect(result).toBe(true);

    patterns = ['pattern1', /foo/];
    msg = 'This is a foo example';
    result = shouldIgnoreEvent(patterns, msg);
    expect(result).toBe(true);

    patterns = ['pattern1', /foo/];
    msg = "This example doesn't match";
    result = shouldIgnoreEvent(patterns, msg);
    expect(result).toBe(false);
  });
});
