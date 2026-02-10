import type { ExceptionEvent } from '@grafana/faro-core';

import { createErrorSignature, normalizeErrorMessage } from './errorSignature';

describe('errorSignature', () => {
  describe('normalizeMessage', () => {
    it.each([
      ['UUIDs', 'User 123e4567-e89b-12d3-a456-426614174000 not found', 'User <UUID> not found'],
      [
        'multiple UUIDs',
        'Linking 550e8400-e29b-41d4-a716-446655440000 to a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        'Linking <UUID> to <UUID>',
      ],
      ['URLs', 'Failed to fetch https://api.example.com/users/123', 'Failed to fetch <URL>'],
      ['file paths', 'Error in /app/src/components/Button.tsx', 'Error in <PATH>'],
      ['timestamps', 'Event at 1234567890123 failed', 'Event at <TIMESTAMP> failed'],
      ['numeric IDs', 'User 123456 not found', 'User <ID> not found'],
      ['quoted strings', 'Cannot read property "foo" of undefined', 'Cannot read property <STRING> of undefined'],
      ['single-quoted strings', "Cannot access 'bar' before initialization", 'Cannot access <STRING> before initialization'],
    ])('normalizes %s', (_, input, expected) => {
      expect(normalizeErrorMessage(input)).toBe(expected);
    });

    it('does not normalize short numbers', () => {
      expect(normalizeErrorMessage('Expected 5 arguments but got 3')).toBe('Expected 5 arguments but got 3');
    });

    it('handles messages with multiple patterns', () => {
      const message = 'User 123456 at https://example.com failed with error "timeout"';
      const normalized = normalizeErrorMessage(message);
      expect(normalized).toBe('User <ID> at <URL> failed with error <STRING>');
    });

    it('handles empty messages', () => {
      const normalized = normalizeErrorMessage('');
      expect(normalized).toBe('');
    });

    it('truncates very long messages', () => {
      const longMessage = 'a'.repeat(1000);
      const normalized = normalizeErrorMessage(longMessage);
      expect(normalized.length).toBeLessThanOrEqual(503); // 500 + "..."
      expect(normalized.endsWith('...')).toBe(true);
    });

    it('preserves structure for similar errors', () => {
      const msg1 = 'User 123456 not found';
      const msg2 = 'User 789012 not found';
      const normalized1 = normalizeErrorMessage(msg1);
      const normalized2 = normalizeErrorMessage(msg2);
      expect(normalized1).toBe(normalized2);
      expect(normalized1).toBe('User <ID> not found');
    });
  });

  describe('createErrorSignature', () => {
    it('creates signature with all components', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'TypeError',
        value: 'Cannot read property "foo" of undefined',
        stacktrace: {
          frames: [{ filename: 'app.js', function: 'handleClick', lineno: 23 }],
        },
        context: { userId: '123' },
      };
      const signature = createErrorSignature(event, { errorUniqueness: { includeContextKeys: true } } as any);
      expect(signature).toContain('TypeError');
      expect(signature).toContain('Cannot read property <STRING> of undefined');
      expect(signature).toContain('app.js:handleClick:23');
      expect(signature).toContain('context:userId');
    });

    it('creates same signature for similar errors with different IDs', () => {
      const event1: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'TypeError',
        value: 'User 123456 not found',
        stacktrace: {
          frames: [{ filename: 'app.js', function: 'fn', lineno: 23 }],
        },
      };
      const event2: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'TypeError',
        value: 'User 789012 not found',
        stacktrace: {
          frames: [{ filename: 'app.js', function: 'fn', lineno: 23 }],
        },
      };
      const sig1 = createErrorSignature(event1, {} as any);
      const sig2 = createErrorSignature(event2, {} as any);
      expect(sig1).toBe(sig2);
    });

    it('creates different signatures for different error types', () => {
      const event1: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'TypeError',
        value: 'foo is not defined',
      };
      const event2: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'ReferenceError',
        value: 'foo is not defined',
      };
      const sig1 = createErrorSignature(event1, {} as any);
      const sig2 = createErrorSignature(event2, {} as any);
      expect(sig1).not.toBe(sig2);
    });

    it('creates different signatures for different stack traces', () => {
      const event1: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'TypeError',
        value: 'Error',
        stacktrace: {
          frames: [{ filename: 'app.js', function: 'fn', lineno: 23 }],
        },
      };
      const event2: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'TypeError',
        value: 'Error',
        stacktrace: {
          frames: [{ filename: 'utils.js', function: 'fn', lineno: 45 }],
        },
      };
      const sig1 = createErrorSignature(event1, {} as any);
      const sig2 = createErrorSignature(event2, {} as any);
      expect(sig1).not.toBe(sig2);
    });

    it('handles errors without stack traces', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'Something went wrong',
      };
      const signature = createErrorSignature(event, {} as any);
      expect(signature).toBe('Error::Something went wrong');
    });

    it('respects stackFrameDepth option', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'test',
        stacktrace: {
          frames: [
            { filename: 'a.js', function: 'fn1', lineno: 1 },
            { filename: 'b.js', function: 'fn2', lineno: 2 },
            { filename: 'c.js', function: 'fn3', lineno: 3 },
          ],
        },
      };
      const signature = createErrorSignature(event, { errorUniqueness: { stackFrameDepth: 2 } } as any);
      expect(signature).toContain('a.js:fn1:1|b.js:fn2:2');
      expect(signature).not.toContain('c.js:fn3:3');
    });

    it('excludes context keys when includeContextKeys is false', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'test',
        context: { userId: '123', page: 'home' },
      };
      const signature = createErrorSignature(event, { errorUniqueness: { includeContextKeys: false } } as any);
      expect(signature).not.toContain('context');
    });

    it('includes sorted context keys when includeContextKeys is true', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'test',
        context: { zoo: '1', apple: '2', banana: '3' },
      };
      const signature = createErrorSignature(event, { errorUniqueness: { includeContextKeys: true } } as any);
      expect(signature).toContain('context:apple,banana,zoo');
    });

    it('uses basename from full file paths for portability', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'test',
        stacktrace: {
          frames: [{ filename: '/path/to/app.js', function: 'handleClick', lineno: 23 }],
        },
      };
      const signature = createErrorSignature(event, {} as any);
      expect(signature).toContain('app.js:handleClick:23');
      expect(signature).not.toContain('/path/to/');
    });

    it('handles stack frames without function names', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'test',
        stacktrace: {
          frames: [{ filename: 'app.js', function: '', lineno: 23 }],
        },
      };
      const signature = createErrorSignature(event, {} as any);
      expect(signature).toContain('app.js:23');
    });

    it('handles empty stack frames', () => {
      const event: ExceptionEvent = {
        timestamp: '2024-01-01T00:00:00.000Z',
        type: 'Error',
        value: 'test',
        stacktrace: { frames: [] },
      };
      const signature = createErrorSignature(event, {} as any);
      expect(signature).toBe('Error::test');
    });
  });
});
