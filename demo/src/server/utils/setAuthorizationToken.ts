import { authorizationCookieName } from './const';
import type { Response } from './types';

export function setAuthorizationToken(res: Response, token: string): void {
  res.cookie(authorizationCookieName, `Bearer ${token}`, {
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    encode: (value) => value,
  });
}
