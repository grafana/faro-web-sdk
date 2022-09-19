import type { Env } from '../../common';

export const env: Env = typeof window !== 'undefined' ? (window as any).__APP_ENV__ : process.env['__APP_ENV__'];
