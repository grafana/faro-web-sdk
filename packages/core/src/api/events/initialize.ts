import type { Config } from '../../config';
import type { InternalLogger } from '../../internalLogger';
import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { TransportItem, Transports } from '../../transports';
import type { UnpatchedConsole } from '../../unpatchedConsole';
import { deepEqual, getCurrentTimestamp, isEmpty, isNull, stringifyObjectValues } from '../../utils';
import { timestampToIsoString } from '../../utils/date';
import type { TracesAPI } from '../traces';
import type { UserActionsAPI } from '../userActions';
import { addItemToUserActionBuffer } from '../userActions/initialize';

import type { EventEvent, EventsAPI } from './types';

export function initializeEventsAPI({
  internalLogger,
  config,
  metas,
  transports,
  tracesApi,
  userActionsApi,
}: {
  unpatchedConsole: UnpatchedConsole;
  internalLogger: InternalLogger;
  config: Config;
  metas: Metas;
  transports: Transports;
  tracesApi: TracesAPI;
  userActionsApi: UserActionsAPI;
}): EventsAPI {
  let lastPayload: Pick<EventEvent, 'name' | 'domain' | 'attributes'> | null = null;

  const pushEvent: EventsAPI['pushEvent'] = (
    name,
    attributes,
    domain,
    { skipDedupe, spanContext, timestampOverwriteMs, customPayloadTransformer = (payload: EventEvent) => payload } = {}
  ) => {
    try {
      const attrs = stringifyObjectValues(attributes);

      const item: TransportItem<EventEvent> = {
        meta: metas.value,
        payload: customPayloadTransformer({
          name,
          domain: domain ?? config.eventDomain,
          attributes: isEmpty(attrs) ? undefined : attrs,
          timestamp: timestampOverwriteMs ? timestampToIsoString(timestampOverwriteMs) : getCurrentTimestamp(),
          trace: spanContext
            ? {
                trace_id: spanContext.traceId,
                span_id: spanContext.spanId,
              }
            : tracesApi.getTraceContext(),
        }),
        type: TransportItemType.EVENT,
      };

      const testingPayload = {
        name: item.payload.name,
        attributes: item.payload.attributes,
        domain: item.payload.domain,
      };

      if (!skipDedupe && config.dedupe && !isNull(lastPayload) && deepEqual(testingPayload, lastPayload)) {
        internalLogger.debug('Skipping event push because it is the same as the last one\n', item.payload);

        return;
      }

      lastPayload = testingPayload;

      internalLogger.debug('Pushing event\n', item);

      if (!addItemToUserActionBuffer(userActionsApi.getActiveUserAction(), item)) {
        transports.execute(item);
      }
    } catch (err) {
      internalLogger.error('Error pushing event', err);
    }
  };

  return {
    pushEvent,
  };
}
