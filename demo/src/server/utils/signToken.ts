import jwt from 'jsonwebtoken';

import type { UserPublicModel } from '../../common';

import { authorizationSecret } from './const';

export function signToken(userPublic: UserPublicModel): string {
  return jwt.sign(userPublic, authorizationSecret, {
    algorithm: 'HS256',
    expiresIn: '1d',
  });
}
