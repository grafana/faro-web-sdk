import jwt from 'jsonwebtoken';

import type { UserPublic } from '../../common';
import { authorizationSecret } from './const';

export function signToken(userPublic: UserPublic): string {
  return jwt.sign(userPublic, authorizationSecret, {
    algorithm: 'HS256',
    expiresIn: '1d',
  });
}
