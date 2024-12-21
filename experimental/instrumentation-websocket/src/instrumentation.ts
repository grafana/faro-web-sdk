import { context, diag, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { _globalThis } from '@opentelemetry/core';
import { InstrumentationBase, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation';

const WS_MODULE = 'WebSocket';

const VERSION = '0.0.1';

// Helper function to check if URL is localhost
function isLocalhost(url: string): boolean {
  try {
    const wsUrl = new URL(url);
    return wsUrl.hostname === 'localhost' || wsUrl.hostname === '127.0.0.1' || wsUrl.hostname === '[::1]';
  } catch {
    return false;
  }
}

export class WebSocketInstrumentation extends InstrumentationBase {
  readonly component: string = 'websocket';
  readonly version: string = VERSION;
  moduleName = this.component;
  constructor() {
    super('faro-instrumentation-websocket', VERSION, {});
  }

  protected init() {
    return [
      new InstrumentationNodeModuleDefinition(
        WS_MODULE,
        ['*'],
        (moduleExports) => {
          diag.debug('Patching WebSocket');
          return this._patchWebSocket(moduleExports);
        },
        (moduleExports) => {
          diag.debug('Unpatching WebSocket');
          return this._unpatchWebSocket(moduleExports);
        }
      ),
    ];
  }

  /**
   * Implements enable function
   */
  override enable(): void {
    if (typeof WebSocket === 'undefined') {
      this._diag.error('WebSocket is not available in this environment');
      return;
    }

    try {
      if (isWrapped(_globalThis.WebSocket)) {
        this._unwrap(_globalThis, 'WebSocket');
        this._diag.debug('removing previous patch for WebSocket');
      }

      this._wrap(_globalThis, 'WebSocket', this._patchWebSocket.bind(this));
      this._diag.debug('WebSocket instrumentation enabled');
    } catch (error) {
      this._diag.error('Failed to enable WebSocket instrumentation', error);
    }
  }

  /**
   * Implements disable function
   */
  override disable(): void {
    try {
      if (isWrapped(_globalThis.WebSocket)) {
        this._unwrap(_globalThis, 'WebSocket');
        this._diag.debug('WebSocket instrumentation disabled');
      }
    } catch (error) {
      this._diag.error('Failed to disable WebSocket instrumentation', error);
    }
  }

  private _patchWebSocket(original: typeof WebSocket): typeof WebSocket {
    const self = this;

    return class PatchedWebSocket extends original {
      private wsSpan: any;
      private wsContext: any;

      constructor(url: string, protocols?: string | string[]) {
        super(url, protocols);

        if (isLocalhost(url)) {
          console.log('Skipping WebSocket instrumentation for localhost:', url);
          return;
        }

        const tracer = self.tracer;
        this.wsSpan = tracer.startSpan('WebSocket.connect', {
          kind: SpanKind.CLIENT,
          attributes: {
            'websocket.url': url,
            'websocket.state': 'connecting',
          },
        });

        this.wsContext = trace.setSpan(context.active(), this.wsSpan);

        this.addEventListener('message', (event) => {
          const messageSpan = tracer.startSpan(
            'websocket.receive',
            {
              kind: SpanKind.CLIENT,
              attributes: {
                'websocket.url': url,
                'websocket.message_type': typeof event.data,
                'websocket.message_size': event.data?.length,
                'websocket.message_payload': event.data,
              },
            },
            this.wsContext
          );
          messageSpan.end();
        });

        this.addEventListener('open', () => {
          this.wsSpan.setAttribute('websocket.state', 'connected');
        });

        this.addEventListener('error', (error: Event) => {
          this.wsSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof ErrorEvent ? error.message : 'WebSocket error',
          });
          this.wsSpan.setAttribute('websocket.state', 'error');
        });

        this.addEventListener('close', () => {
          this.wsSpan.setAttribute('websocket.state', 'closed');
          this.wsSpan.end();
        });

        // Patch send method
        const originalSend = this.send;
        this.send = function (data: string) {
          try {
            originalSend.call(this, data);
            const sendSpan = tracer.startSpan(
              'websocket.send',
              {
                kind: SpanKind.CLIENT,
                attributes: {
                  'websocket.url': url,
                  'websocket.message_type': typeof data,
                  'websocket.message_payload': data,
                },
              },
              this.wsContext
            );
            sendSpan.end();
          } catch (error: unknown) {
            this.wsSpan.setStatus({
              code: SpanStatusCode.ERROR,
              message: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
          }
        };
      }
    } as typeof WebSocket;
  }

  private _unpatchWebSocket(WebSocketClass: any) {
    return WebSocketClass;
  }
}
