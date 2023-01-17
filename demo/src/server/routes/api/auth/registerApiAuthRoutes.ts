import { Router } from 'express';
import type { Express } from 'express';

import { authMiddleware } from '../../../middlewares';

import { loginHandler } from './loginHandler';
import { logoutHandler } from './logoutHandler';
import { registerHandler } from './registerHandler';
import { stateHandler } from './stateHandler';

export function registerApiAuthRoutes(apiRouter: Router, _app: Express): void {
  const authRouter = Router();

  authRouter.post('/register', registerHandler);
  authRouter.post('/login', loginHandler);
  authRouter.get('/logout', authMiddleware, logoutHandler);
  authRouter.get('/state', authMiddleware, stateHandler);

  apiRouter.use('/auth', authRouter);
}
