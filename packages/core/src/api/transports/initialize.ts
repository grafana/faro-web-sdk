import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Transports } from '../../transports';
import type { TransportsAPI } from './types';

export function initializeTransportsAPI(
  internalLogger: InternalLogger,
  _config: Config,
  transports: Transports
): TransportsAPI {
  internalLogger.debug('Initializing transports API');

  const getAllIgnoreUrls: TransportsAPI['getAllIgnoreUrls'] = () => {
    return transports.transports.flatMap((transport) => transport.getIgnoreUrls());
  };

  return {
    getAllIgnoreUrls,
  };
}
