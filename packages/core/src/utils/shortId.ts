const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

export function genShortID(length = 10): string {
  const values = new Uint32Array(length);
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i++) {
      values[i] = Math.floor(Math.random() * 0x100000000);
    }
  }

  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet[values[i]! % alphabet.length];
  }
  return result;
}
