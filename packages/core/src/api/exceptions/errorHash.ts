/**
 * Fast hashing utilities for error signatures.
 * Uses DJB2a algorithm for speed and good distribution.
 */

/**
 * DJB2a hash function - fast, non-cryptographic hash with good distribution.
 * Returns a 32-bit unsigned integer.
 *
 * @param str - String to hash
 * @returns 32-bit unsigned hash value
 */
export function djb2aHash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to 32-bit unsigned
}

/**
 * Hash an error signature string to a 32-bit integer.
 * Used for storage and comparison in the uniqueness tracker.
 *
 * @param signature - Error signature string from createErrorSignature()
 * @returns Hash value for storage
 */
export function hashErrorSignature(signature: string): number {
  return djb2aHash(signature);
}
