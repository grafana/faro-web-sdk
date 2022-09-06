import { sendError } from './sendError';
import type { Response } from './types';

export function sendUnauthenticatedError(res: Response): void {
  sendError(res, 'Unauthenticated', 401);
}
