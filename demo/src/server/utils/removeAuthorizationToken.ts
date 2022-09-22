import { authorizationCookieName } from './const';
import type { Response } from './types';

export function removeAuthorizationToken(res: Response): void {
  res.cookie(authorizationCookieName, 'expired', {
    httpOnly: true,
    maxAge: -1,
  });
}
