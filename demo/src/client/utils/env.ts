import type { PublicEnv } from '../../common';

export const env: PublicEnv = typeof window !== 'undefined' ? (window as any).__APP_ENV__ : process.env['__APP_ENV__'];
