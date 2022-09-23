import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItem, TransportItemType, Transports } from '../../transports';
import { deepEqual, getCurrentTimestamp, isNull } from '../../utils';
import type { TracesAPI } from '../traces';
import type { EventEvent, EventsAPI } from './types';

export function initializeEventsAPI(
  internalLogger: InternalLogger,
  config: Config,
  transports: Transports,
  metas: Metas,
  tracesApi: TracesAPI
): EventsAPI {
  let lastPayload: Pick<EventEvent, 'name' | 'domain' | 'attributes'> | null = null;

  const pushEvent: EventsAPI['pushEvent'] = (name, attributes, domain, { forcePush } = {}) => {
    try {
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

      const testingPayload = {
        name: item.payload.name,
        attributes: item.payload.attributes,
        domain: item.payload.domain,
      };

      if (!forcePush && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
        internalLogger.debug('Skipping event push because it is the same as the last one\n', item.payload);

        return;
      }

      lastPayload = testingPayload;

      internalLogger.debug('Pushing event\n', item);

      transports.execute(item);
    } catch (err) {
      internalLogger.error('Error pushing event', err);
    }
  };

  return {
    pushEvent,
  };
}
