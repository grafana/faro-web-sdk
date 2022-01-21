import type { Meta } from '../../meta';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { TracesAPI } from './types';

export function initializeTraces(transports: Transports, meta: Meta): TracesAPI {
  const pushSpan: TracesAPI['pushSpan'] = (payload) => {
    transports.execute({
      type: TransportItemType.TRACE,
      payload,
      meta: meta.values,
    });
  };

  return {
    pushSpan,
  };
}
