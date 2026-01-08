import { getDetailsFromConsoleErrorArgs, getDetailsFromErrorArgs, reactNativeLogArgsSerializer } from './utils';

describe('console utils', () => {
  describe('reactNativeLogArgsSerializer', () => {
    it('serializes string arguments', () => {
      const result = reactNativeLogArgsSerializer(['hello', 'world']);
      expect(result).toBe('hello world');
    });

    it('serializes number arguments', () => {
      const result = reactNativeLogArgsSerializer([123, 456]);
      expect(result).toBe('123 456');
    });

    it('serializes boolean arguments', () => {
      const result = reactNativeLogArgsSerializer([true, false]);
      expect(result).toBe('true false');
    });

    it('handles null and undefined', () => {
      const result = reactNativeLogArgsSerializer([null, undefined]);
      expect(result).toBe('null undefined');
    });

    it('serializes Error objects', () => {
      const error = new Error('Test error');
      const result = reactNativeLogArgsSerializer([error]);
      expect(result).toBe('Error: Test error');
    });

    it('serializes custom Error subclasses', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }
      const error = new CustomError('Custom error message');
      const result = reactNativeLogArgsSerializer([error]);
      expect(result).toBe('CustomError: Custom error message');
    });

    it('stringifies objects as JSON', () => {
      const obj = { foo: 'bar', baz: 123 };
      const result = reactNativeLogArgsSerializer([obj]);
      expect(result).toBe('{"foo":"bar","baz":123}');
    });

    it('stringifies arrays as JSON', () => {
      const arr = [1, 2, 3];
      const result = reactNativeLogArgsSerializer([arr]);
      expect(result).toBe('[1,2,3]');
    });

    it('handles nested objects', () => {
      const obj = { outer: { inner: 'value' } };
      const result = reactNativeLogArgsSerializer([obj]);
      expect(result).toBe('{"outer":{"inner":"value"}}');
    });

    it('handles circular references gracefully', () => {
      const obj: any = { foo: 'bar' };
      obj.self = obj; // Create circular reference

      const result = reactNativeLogArgsSerializer([obj]);
      // Should fallback to String() when JSON.stringify fails
      expect(result).toContain('object');
    });

    it('handles mixed argument types', () => {
      const result = reactNativeLogArgsSerializer(['string', 123, true, { key: 'value' }, null]);
      expect(result).toBe('string 123 true {"key":"value"} null');
    });

    it('returns empty string for serialization errors', () => {
      const problematicArg = {
        toJSON: () => {
          throw new Error('Cannot serialize');
        },
      };

      const result = reactNativeLogArgsSerializer([problematicArg]);
      // Should handle error gracefully
      expect(typeof result).toBe('string');
    });

    it('joins multiple arguments with space', () => {
      const result = reactNativeLogArgsSerializer(['a', 'b', 'c', 'd']);
      expect(result).toBe('a b c d');
    });
  });

  describe('getDetailsFromErrorArgs', () => {
    it('extracts details from Error object', () => {
      const error = new Error('Test error message');
      const details = getDetailsFromErrorArgs([error]);

      expect(details.value).toBe('Test error message');
      expect(details.type).toBe('Error');
      expect(Array.isArray(details.stackFrames)).toBe(true);
    });

    it('extracts details from custom Error', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('Custom message');
      const details = getDetailsFromErrorArgs([error]);

      expect(details.value).toBe('Custom message');
      expect(details.type).toBe('CustomError');
    });

    it('handles string first argument', () => {
      const details = getDetailsFromErrorArgs(['Simple error message']);

      expect(details.value).toBe('Simple error message');
      expect(details.type).toBeUndefined();
      expect(details.stackFrames).toEqual([]);
    });

    it('handles object first argument', () => {
      const obj = { message: 'error', code: 500 };
      const details = getDetailsFromErrorArgs([obj]);

      expect(details.value).toBe('{"message":"error","code":500}');
      expect(details.type).toBeUndefined();
    });

    it('handles non-stringifiable object', () => {
      const obj: any = { message: 'error' };
      obj.circular = obj;

      const details = getDetailsFromErrorArgs([obj]);

      expect(typeof details.value).toBe('string');
      expect(details.value).toContain('object');
    });

    it('parses stack frames from Error', () => {
      const error = new Error('Test error');
      // Manually set stack for testing
      error.stack = `Error: Test error
    at testFunction (file.js:10:5)
    at anotherFunction (another.js:20:10)`;

      const details = getDetailsFromErrorArgs([error]);

      expect(details.stackFrames).toBeDefined();
      expect(details.stackFrames!.length).toBeGreaterThan(0);
    });

    it('returns empty stack frames for Error without stack', () => {
      const error = new Error('No stack');
      error.stack = undefined;

      const details = getDetailsFromErrorArgs([error]);

      expect(details.stackFrames).toEqual([]);
    });
  });

  describe('getDetailsFromConsoleErrorArgs', () => {
    const mockSerializer = (args: any[]) => args.join(' ');

    it('uses getDetailsFromErrorArgs when first arg is Error', () => {
      const error = new Error('Test error');
      const details = getDetailsFromConsoleErrorArgs([error], mockSerializer);

      expect(details.value).toBe('Test error');
      expect(details.type).toBe('Error');
      expect(Array.isArray(details.stackFrames)).toBe(true);
    });

    it('uses serializer when first arg is not Error', () => {
      const details = getDetailsFromConsoleErrorArgs(['string', 'args'], mockSerializer);

      expect(details.value).toBe('string args');
      expect(details.type).toBeUndefined();
      expect(details.stackFrames).toBeUndefined();
    });

    it('uses serializer for objects', () => {
      const details = getDetailsFromConsoleErrorArgs([{ foo: 'bar' }, 'extra'], mockSerializer);

      expect(details.value).toBe('[object Object] extra');
    });

    it('uses serializer for numbers', () => {
      const details = getDetailsFromConsoleErrorArgs([123, 456], mockSerializer);

      expect(details.value).toBe('123 456');
    });

    it('handles empty args', () => {
      const details = getDetailsFromConsoleErrorArgs([], mockSerializer);

      expect(details.value).toBe('');
    });

    it('preserves Error stack frames', () => {
      const error = new Error('Error with stack');
      error.stack = `Error: Error with stack
    at func (file.js:1:1)`;

      const details = getDetailsFromConsoleErrorArgs([error], mockSerializer);

      expect(details.stackFrames).toBeDefined();
      expect(details.stackFrames!.length).toBeGreaterThan(0);
    });
  });
});
