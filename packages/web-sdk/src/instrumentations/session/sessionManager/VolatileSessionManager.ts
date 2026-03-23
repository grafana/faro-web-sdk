import { webStorageType } from '../../../utils/webStorage';

import { createSessionManagerClass } from './createSessionManager';

export const VolatileSessionsManager = createSessionManagerClass(webStorageType.session);
