import jwt from 'jsonwebtoken';

import type { UserPublic } from '../../common';
import { getUserById, getUserPublicFromUser } from '../data';
import { logger } from '../logger';
import { authorizationSecret } from './const';

export function verifyToken(token: string | undefined): UserPublic | undefined {
  try {
    if (!token) {
      return undefined;
    }

    jwt.verify(token, authorizationSecret, {
      algorithms: ['HS256'],
    });

    const decodedToken = jwt.decode(token, {
      json: true,
    });

    const user = getUserById(decodedToken?.['id']);

    return user ? getUserPublicFromUser(user) : undefined;
  } catch (err) {
    logger.error(err);

    return undefined;
  }
}
