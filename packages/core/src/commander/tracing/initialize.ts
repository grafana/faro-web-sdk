import type { Meta } from '../../meta';
import { TransportItemType } from '../../transports';
import type { Transports } from '../../transports';
import type { Commands } from './commands';

export function initialize(transports: Transports, meta: Meta): Commands {
  const pushSpan: Commands['pushSpan'] = (payload) => {
    transports.execute({
      type: TransportItemType.TRACES,
      payload,
      meta: meta.values,
    });
  };

  return {
    pushSpan,
  };
}
