import type { Metas } from '../../metas';
import type { Transports } from '../../transports';
import { TransportItemType } from '../../transports';
import { getRandomTraceId } from '../../utils';
import { spanGenerator } from './span';
import type { TracesAPI } from './types';

export function initializeTraces(transports: Transports, metas: Metas): TracesAPI {
  let traceId: string = getRandomTraceId();

  const getTraceId: TracesAPI['getTraceId'] = () => traceId;

  const pushSpan: TracesAPI['pushSpan'] = (payload) => {
    transports.execute({
      type: TransportItemType.TRACE,
      payload,
      meta: metas.value,
    });
  };

  const getNewSpan: TracesAPI['getNewSpan'] = (options) => spanGenerator(traceId, pushSpan, options);

  return {
    getNewSpan,
    getTraceId,
    pushSpan,
  };
}
