import * as publicAPI from '../index';
import { initializeFaro } from '../initialize';
import type { Metas } from '../metas';
import { mockConfig, MockTransport } from '../testUtils';
import { TransportItemType } from '../transports';

import { getInternalMetas, type InternalMetas } from './metas';

describe('internal metas', () => {
  it('keeps coordination hooks off the public Metas type and object', () => {
    const { metas } = initializeFaro(mockConfig());
    getInternalMetas(metas);
    const internalKeys: Array<Exclude<keyof InternalMetas, keyof Metas>> = [
      'addSessionUpdateListener',
      'removeSessionUpdateListener',
      'notifySessionUpdate',
      'shouldCapture',
      'addCaptureFilter',
      'removeCaptureFilter',
    ];

    for (const key of internalKeys) {
      expect(key in metas).toBe(false);
    }
    expect(publicAPI).not.toHaveProperty('getInternalMetas');
  });

  it('isolates capture filters and session update listeners between SDK instances', () => {
    const firstTransport = new MockTransport();
    const secondTransport = new MockTransport();
    const first = initializeFaro(mockConfig({ transports: [firstTransport] }));
    const second = initializeFaro(mockConfig({ transports: [secondTransport] }));
    const firstListener = jest.fn();
    const secondListener = jest.fn();
    getInternalMetas(first.metas).addCaptureFilter(() => false);
    getInternalMetas(first.metas).addSessionUpdateListener(firstListener);
    getInternalMetas(second.metas).addSessionUpdateListener(secondListener);

    first.api.setSession({ id: 'first' });
    first.api.pushEvent('first-event');
    second.api.setSession({ id: 'second' });
    second.api.pushEvent('second-event');

    expect(firstListener.mock.calls).toEqual([[{ type: 'replace', session: { id: 'first' }, overrides: undefined }]]);
    expect(secondListener.mock.calls).toEqual([[{ type: 'replace', session: { id: 'second' }, overrides: undefined }]]);
    expect(firstTransport.items).toEqual([]);
    expect(secondTransport.items).toHaveLength(1);
    expect(secondTransport.items[0]?.meta.session?.id).toBe('second');
  });

  it('filters signals before deduplication and buffering while allowing metadata updates', () => {
    const transport = new MockTransport();
    const { api, metas, transports } = initializeFaro(mockConfig({ transports: [transport] }));
    const filter = () => false;
    const secondFilter = () => false;
    const error = new Error('same error');
    const pushSignals = () => {
      api.pushEvent('same event');
      api.pushLog(['same log']);
      api.pushMeasurement({ type: 'same measurement', values: { count: 1 } });
      api.pushError(error);
      api.pushTraces({ resourceSpans: [] });
      // Extensions can bypass the public push APIs.
      transports.execute({ type: TransportItemType.TRACE, payload: { resourceSpans: [] }, meta: metas.value });
    };
    getInternalMetas(metas).addCaptureFilter(filter);
    getInternalMetas(metas).addCaptureFilter(secondFilter);
    api.setSession({ id: 'updated-while-filtered' });
    pushSignals();
    expect(api.getSession()?.id).toBe('updated-while-filtered');
    expect(transport.items).toEqual([]);

    getInternalMetas(metas).removeCaptureFilter(filter);
    pushSignals();
    expect(transport.items).toEqual([]);

    getInternalMetas(metas).removeCaptureFilter(secondFilter);
    pushSignals();
    expect(transport.items).toHaveLength(6);
    expect(transport.items.every((item) => item.meta.session?.id === 'updated-while-filtered')).toBe(true);
    pushSignals();
    // Traces are not deduplicated. The four other signals still are.
    expect(transport.items).toHaveLength(8);
  });
});
