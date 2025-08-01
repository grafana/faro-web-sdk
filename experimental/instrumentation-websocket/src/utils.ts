// Helper function to check if URL is localhost
export function isLocalhost(url: string): boolean {
  try {
    const wsUrl = new URL(url);
    return wsUrl.hostname === 'localhost' || wsUrl.hostname === '127.0.0.1' || wsUrl.hostname === '[::1]';
  } catch {
    return false;
  }
}

export function generateRequestId(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
