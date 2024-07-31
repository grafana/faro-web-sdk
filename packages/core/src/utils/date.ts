export function dateNow(): number {
  return Date.now();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function timestampToIsoString(value: string): string {
  return new Date(value).toISOString();
}
