import type { LogEvent, Meta, TransportItem } from '..';
import { getTransportBody, TransportItemType } from '..';
import { getCurrentTimestamp, LogLevel } from '../utils';

describe('SDK version validation', () => {
  it.each(['1.0.0', '0.1.0-alpha.1', '2.3.4+build.5', '1.2.3-beta.2+sha.abc123'])(
    'keeps valid semantic version %s',
    (version) => {
      const item = generateLog({
        sdk: {
          name: 'custom-sdk',
          version,
        },
      });

      expect(getTransportBody([item]).meta.sdk).toEqual({
        name: 'custom-sdk',
        version,
      });
    }
  );

  it.each(['v1.2.3', '1.2', '01.2.3', '1.2.3.4', 'release-1.2.3', '1.2.3-01'])(
    'omits invalid SDK version %s while preserving the rest of the SDK metadata',
    (version) => {
      const integrations = [{ name: 'integration', version: '1.0.0' }];
      const item = generateLog({
        sdk: {
          name: 'custom-sdk',
          version,
          integrations,
        },
      });

      expect(getTransportBody([item]).meta.sdk).toEqual({
        name: 'custom-sdk',
        integrations,
      });
      expect(item.meta.sdk?.version).toBe(version);
    }
  );
});

function generateLog(meta: Meta): TransportItem<LogEvent> {
  return {
    type: TransportItemType.LOG,
    payload: {
      context: {},
      level: LogLevel.LOG,
      message: 'test log',
      timestamp: getCurrentTimestamp(),
    },
    meta,
  };
}
