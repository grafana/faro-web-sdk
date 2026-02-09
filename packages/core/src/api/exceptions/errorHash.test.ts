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
      expect(hash).toBe(5381); // Initial hash value
    });

    it('handles long strings', () => {
      const longString = 'a'.repeat(10000);
      const hash = djb2aHash(longString);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
    });

    it('handles special characters', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      const hash = djb2aHash(specialChars);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it('handles unicode characters', () => {
      const unicode = '你好世界🌍';
      const hash = djb2aHash(unicode);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it('produces different hashes for similar strings', () => {
      const hash1 = djb2aHash('Cannot read property "foo" of undefined');
      const hash2 = djb2aHash('Cannot read property "bar" of undefined');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('hashErrorSignature', () => {
    it('returns consistent hash for same signature', () => {
      const signature = 'TypeError::Cannot read property <STRING> of undefined::app.js:handleClick:23';
      const hash1 = hashErrorSignature(signature);
      const hash2 = hashErrorSignature(signature);
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for different signatures', () => {
      const sig1 = 'TypeError::Cannot read property "x" of undefined::app.js:23';
      const sig2 = 'ReferenceError::foo is not defined::utils.js:45';
      const hash1 = hashErrorSignature(sig1);
      const hash2 = hashErrorSignature(sig2);
      expect(hash1).not.toBe(hash2);
    });
  });
});
