import type { Meta } from '../../meta/types';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { TracesCommands } from './types';

export function initializeTraces(transports: Transports, meta: Meta): TracesCommands {
  const pushSpan: TracesCommands['pushSpan'] = (payload) => {
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
