import { djb2aHash, hashErrorSignature } from './errorHash';

describe('errorHash', () => {
  describe('djb2aHash', () => {
    it('returns consistent hash for same string', () => {
      const str = 'test error signature';
      const hash1 = djb2aHash(str);
      const hash2 = djb2aHash(str);
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different strings', () => {
      const hash1 = djb2aHash('error message 1');
      const hash2 = djb2aHash('error message 2');
      expect(hash1).not.toBe(hash2);
    });

    it('returns 32-bit unsigned integer', () => {
      const hash = djb2aHash('test');
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xffffffff);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it('handles empty string', () => {
      const hash = djb2aHash('');
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
    });
  });

  describe('hashErrorSignature', () => {
    it('wraps djb2aHash', () => {
      const signature = 'TypeError::Cannot read property <STRING> of undefined::app.js:handleClick:23';
      expect(hashErrorSignature(signature)).toBe(djb2aHash(signature));
    });
  });
});
