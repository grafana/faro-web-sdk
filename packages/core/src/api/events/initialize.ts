import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import { getCurrentTimestamp } from '../../utils';
import type { TracesAPI } from '../traces';
import type { EventEvent, EventsAPI } from './types';

export function initializeEventsAPI(
  internalLogger: InternalLogger,
  config: Config,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): EventsAPI {
  const pushEvent: EventsAPI['pushEvent'] = (name, attributes, domain) => {
    const item: TransportItem<EventEvent> = {
      meta: metas.value,
      payload: {
        name,
        domain: domain ?? config.eventDomain,
        attributes,
        timestamp: getCurrentTimestamp(),
        trace: tracesApi.getTraceContext(),
      },
      type: TransportItemType.EVENT,
    };

    internalLogger.debug('Pushing event', item);

    transports.execute(item);
  };

  return {
    pushEvent,
  };
}
