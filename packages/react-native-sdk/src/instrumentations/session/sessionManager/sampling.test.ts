import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { createSession } from '../../../metas';

import { isSampled } from './sampling';

describe('Sampling.', () => {
  afterEach(() => {
    jest.spyOn(global.Math, 'random').mockRestore();
  });

  it('Returns false if sampleRate is not of type number.', () => {
    const config = mockConfig({
      sessionTracking: {
        samplingRate: 'hello' as any,
      },
    });

    initializeFaro(config);

    expect(isSampled()).toBe(false);
  });

  it('Returns proper sampling decision for configured samplingRate.', () => {
    let config = mockConfig({
      sessionTracking: {
        enabled: true,
        samplingRate: 1,
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);

    config.sessionTracking!.samplingRate = 0;
    initializeFaro(config);
    expect(isSampled()).toBe(false);
  });

  it('Returns proper sampling decision for rate returned by sampler function.', () => {
    let config = mockConfig({
      sessionTracking: {
        enabled: true,
        sampler: () => {
          return 1;
        },
      },
    });

    initializeFaro(config);
    expect(isSampled()).toBe(true);

    config.sessionTracking!.sampler = () => 0;
    initializeFaro(config);
    expect(isSampled()).toBe(false);

    config.sessionTracking!.session = createSession({ location: 'moon' });
    config.sessionTracking!.sampler = ({ metas }) => {
      if (metas.session?.attributes?.['location'] === 'moon') {
        return 0;
      }
      return 1;
    };
    initializeFaro(config);
    expect(isSampled()).toBe(false);

    config.sessionTracking!.session = createSession({ location: 'mars' });
    initializeFaro(config);
    expect(isSampled()).toBe(true);
  });
});
