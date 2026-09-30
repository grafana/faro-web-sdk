import { initializeFaro, Observable } from '@grafana/faro-core';
import type { EventEvent, TransportItem } from '@grafana/faro-core';
import { mockConfig, MockTransport } from '@grafana/faro-core/src/testUtils';

import { MESSAGE_TYPE_DOM_MUTATION, MESSAGE_TYPE_HTTP_REQUEST_END } from '../_internal/monitors/const';

import { FrustrationInstrumentation } from './instrumentation';

let http$: Observable<any>;
let dom$: Observable<any>;
let perf$: Observable<any>;

jest.useFakeTimers();

jest.mock('../_internal/monitors/domMutationMonitor', () => ({
  monitorDomMutations: () => dom$,
}));

jest.mock('../_internal/monitors/httpRequestMonitor', () => ({
  monitorHttpRequests: () => http$,
}));

jest.mock('../_internal/monitors/performanceEntriesMonitor', () => ({
  monitorPerformanceEntries: () => perf$,
}));

describe('FrustrationInstrumentation', () => {
  let instrumentation: FrustrationInstrumentation;
  let transport: MockTransport;
  let button: HTMLButtonElement;

  function setup(config: Parameters<typeof mockConfig>[0] = {}) {
    transport = new MockTransport();
    instrumentation = new FrustrationInstrumentation();
    initializeFaro(mockConfig({ transports: [transport], instrumentations: [instrumentation], ...config }));
  }

  function events() {
    return (transport.items as Array<TransportItem<EventEvent>>).map((item) => item.payload);
  }

  function click(target: Element = button, { clientX = 10, clientY = 10 } = {}) {
    target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX, clientY }));
  }

  function domMutation() {
    dom$.notify({ type: MESSAGE_TYPE_DOM_MUTATION });
  }

  beforeEach(() => {
    http$ = new Observable();
    dom$ = new Observable();
    perf$ = new Observable();

    button = document.createElement('button');
    button.id = 'save';
    button.className = 'btn primary';
    document.body.appendChild(button);
  });

  afterEach(() => {
    instrumentation?.destroy();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('does not report clicks that cause page activity', () => {
    setup();

    click();
    domMutation();
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('reports a click without page activity as a dead click', () => {
    setup();

    click();
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([
      expect.objectContaining({
        name: 'faro.frustration.dead_click',
        attributes: { target: 'button#save.btn.primary', clickCount: '1', clientX: '10', clientY: '10' },
      }),
    ]);
  });

  it('reports repeated dead clicks on the same element separately', () => {
    setup();

    click();
    jest.advanceTimersByTime(2000);
    click();
    jest.advanceTimersByTime(2000);

    expect(events().map(({ name }) => name)).toEqual(['faro.frustration.dead_click', 'faro.frustration.dead_click']);
  });

  it('timestamps a signal with the time of the click instead of the time it is reported', () => {
    setup();
    const clickedAt = Date.now();

    click();
    jest.advanceTimersByTime(2000);

    expect(events()[0]?.timestamp).toBe(new Date(clickedAt).toISOString());
  });

  it('reports a click as dead when the page activity starts too late', () => {
    setup();

    click();
    jest.advanceTimersByTime(150);
    domMutation();
    jest.advanceTimersByTime(2000);

    expect(events().map(({ name }) => name)).toEqual(['faro.frustration.dead_click']);
  });

  it('does not count ending http requests as page activity', () => {
    setup();

    click();
    http$.notify({ type: MESSAGE_TYPE_HTTP_REQUEST_END, request: { requestId: '1' } });
    jest.advanceTimersByTime(2000);

    expect(events().map(({ name }) => name)).toEqual(['faro.frustration.dead_click']);
  });

  it('does not report a dead click when the page reacts on pointerdown', () => {
    setup();

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    domMutation();
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it.each([
    ['a text input', '<input type="text" />', 'input'],
    ['a link', '<a href="#foo"><span>link</span></a>', 'span'],
    ['a label of a text input', '<label for="name">Name</label><input id="name" />', 'label'],
  ])('does not report dead clicks on %s', (_, html, selector) => {
    setup();
    document.body.innerHTML = html;

    click(document.querySelector(selector)!);
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('does not report dead clicks that change the text selection', () => {
    setup();
    let selection = '';
    jest.spyOn(window, 'getSelection').mockImplementation(() => ({ toString: () => selection }) as Selection);

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    selection = 'selected text';
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('reports a burst of clicks as a single rage click', () => {
    setup();

    for (let i = 0; i < 5; i++) {
      click();
      domMutation();
      jest.advanceTimersByTime(200);
    }
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([
      expect.objectContaining({
        name: 'faro.frustration.rage_click',
        attributes: {
          target: 'button#save.btn.primary',
          clickCount: '5',
          clientX: '10',
          clientY: '10',
          durationMs: '800',
        },
      }),
    ]);
  });

  it('reports a burst of clicks without page activity only as a rage click', () => {
    setup();

    click();
    click();
    click();
    jest.advanceTimersByTime(2000);

    expect(events().map(({ name }) => name)).toEqual(['faro.frustration.rage_click']);
  });

  it('does not report slow repeated clicks as a rage click', () => {
    setup();

    for (let i = 0; i < 3; i++) {
      click();
      domMutation();
      jest.advanceTimersByTime(600);
    }
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('does not report clicks on different targets as a rage click', () => {
    setup();
    const other = document.createElement('div');
    document.body.appendChild(other);

    [button, other, button].forEach((target) => {
      click(target);
      domMutation();
    });
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('does not report clicks far apart as a rage click', () => {
    setup();

    [0, 150, 300].forEach((clientX) => {
      click(button, { clientX });
      domMutation();
    });
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('does not report a rage click while the user scrolls', () => {
    setup();

    click();
    window.dispatchEvent(new Event('scroll'));
    click();
    click();
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('reports a click followed by an error as an error click', () => {
    setup();

    click();
    domMutation();
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom'), message: 'boom' }));
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([
      expect.objectContaining({
        name: 'faro.frustration.error_click',
        attributes: { target: 'button#save.btn.primary', clickCount: '1', clientX: '10', clientY: '10' },
      }),
    ]);
  });

  it('reports a click followed by an unhandled rejection as an error click', () => {
    setup();

    click();
    domMutation();
    const event = new Event('unhandledrejection') as PromiseRejectionEvent;
    Object.defineProperty(event, 'reason', { value: new Error('boom') });
    window.dispatchEvent(event);
    jest.advanceTimersByTime(2000);

    expect(events().map(({ name }) => name)).toEqual(['faro.frustration.error_click']);
  });

  it('does not report error clicks for ignored errors', () => {
    setup({ ignoreErrors: ['ResizeObserver loop'] });

    click();
    domMutation();
    window.dispatchEvent(new ErrorEvent('error', { message: 'ResizeObserver loop completed' }));
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('does not report errors that happen long after a click', () => {
    setup();

    click();
    domMutation();
    jest.advanceTimersByTime(2000);
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('boom'), message: 'boom' }));
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });

  it('reports the previous click as soon as the user clicks somewhere else', () => {
    setup();
    const other = document.createElement('div');
    document.body.appendChild(other);

    click();
    jest.advanceTimersByTime(150);
    click(other);
    domMutation();
    jest.advanceTimersByTime(100);

    expect(events()).toEqual([
      expect.objectContaining({
        name: 'faro.frustration.dead_click',
        attributes: expect.objectContaining({ target: 'button#save.btn.primary' }),
      }),
    ]);
  });

  it('stops listening after destroy', () => {
    setup();

    instrumentation.destroy();
    click();
    jest.advanceTimersByTime(2000);

    expect(events()).toEqual([]);
  });
});
