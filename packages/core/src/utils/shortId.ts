const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

export function genShortID(length = 10): string {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += alphabet[(Math.random() * alphabet.length) | 0];
  }
  return id;
}
