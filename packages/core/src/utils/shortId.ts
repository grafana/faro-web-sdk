const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

export function genShortID(length = 10): string {
  return Array.from(Array(length))
    .map(() => alphabet[Math.floor(Math.random() * alphabet.length)]!)
    .join('');
}
