import { MockTransport } from '@grafana/faro-core/src/testUtils';

import { faro, getInternalFaroFromGlobalObject, globalObject, initializeFaro } from './index';

describe('initializeFaro', () => {
  it('keeps the exported singleton and its transport after isolated initialization', () => {
    const globalTransport = new MockTransport();
    const isolatedTransport = new MockTransport();
    const config = {
      app: { name: 'issue-1846' },
      instrumentations: [],
      metas: [],
      batching: { enabled: false },
    };

    const globalFaro = initializeFaro({ ...config, transports: [globalTransport] });

    expect(faro).toBe(globalFaro);
    expect(globalObject['faro']).toBe(globalFaro);
    expect(getInternalFaroFromGlobalObject()).toBe(globalFaro);

    const isolatedFaro = initializeFaro({ ...config, transports: [isolatedTransport], isolate: true });

    expect(globalObject['faro']).toBe(globalFaro);
    expect(getInternalFaroFromGlobalObject()).toBe(globalFaro);
    expect(faro).toBe(globalFaro);
    expect(faro).not.toBe(isolatedFaro);

    faro.api.pushLog(['through exported faro']);

    expect(globalTransport.items).toHaveLength(1);
    expect(isolatedTransport.items).toHaveLength(0);
    expect(globalTransport.items[0]?.payload).toMatchObject({ message: 'through exported faro' });

    isolatedFaro.api.pushLog(['through isolated handle']);

    expect(globalTransport.items).toHaveLength(1);
    expect(isolatedTransport.items).toHaveLength(1);
    expect(isolatedTransport.items[0]?.payload).toMatchObject({ message: 'through isolated handle' });

    const exposedIsolatedFaro = initializeFaro({
      ...config,
      transports: [],
      isolate: true,
      globalObjectKey: 'isolatedFaro',
    });

    expect(globalObject['isolatedFaro']).toBe(exposedIsolatedFaro);
    expect(globalObject['faro']).toBe(globalFaro);
    expect(getInternalFaroFromGlobalObject()).toBe(globalFaro);
    expect(faro).toBe(globalFaro);
  });
});
