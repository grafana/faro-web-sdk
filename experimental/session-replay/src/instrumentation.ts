import { record } from 'rrweb';

import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';


/**
 * Instrumentation for Performance Timeline API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTimeline
 *
 * !!! This instrumentation is in experimental state and it's not meant to be used in production yet. !!!
 * !!! If you want to use it, do it at your own risk. !!!
 */
export class SessionReplayInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:session-replay';
  readonly version = VERSION;

  private stopFn: any;

  initialize(): void {
    this.stopFn = record({
      emit: (event) => {
        faro.api.pushEvent('replay_event', {
          "timestamp": event.timestamp.toString(),
          "delay": event.delay?.toString() ?? "",
          "type": event.type.toString(),
          "data": JSON.stringify(event.data),
        });
      },
    });
  }

  destroy(): void {
    this.stopFn();
  }
}
