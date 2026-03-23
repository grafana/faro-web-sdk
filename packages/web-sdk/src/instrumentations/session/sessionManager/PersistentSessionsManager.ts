import { webStorageType } from '../../../utils/webStorage';

import { createSessionManagerClass } from './createSessionManager';

export const PersistentSessionsManager = createSessionManagerClass(webStorageType.local);
