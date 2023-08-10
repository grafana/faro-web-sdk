import { globalObject } from '@grafana/faro-core';

declare global {
  // @ts-expect-error
  Event = (typeof Event !== 'undefined' ? Event : new PressEvent({})) as unknown;
  globalObject.Event = Event;
}

export { };
