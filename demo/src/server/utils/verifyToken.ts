import jwt from 'jsonwebtoken';

import type { UserPublicModel } from '../../common';
import { getUserById, getUserPublicFromUser } from '../db';
import { logger } from '../logger';

import { authorizationSecret } from './const';

export async function verifyToken(token: string | undefined): Promise<UserPublicModel | undefined> {
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

    const user = await getUserById(decodedToken?.['id']);

    return user ? await getUserPublicFromUser(user) : undefined;
  } catch (err) {
    logger.error(err);

    return undefined;
  }
}
