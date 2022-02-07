import type { Metas } from '../../metas';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { TracesAPI } from './types';

export function initializeTraces(transports: Transports, metas: Metas): TracesAPI {
  const pushSpan: TracesAPI['pushSpan'] = (payload) => {
    transports.execute({
      type: TransportItemType.TRACE,
      payload,
      meta: metas.value,
    });
  };

  return {
    pushSpan,
  };
}
