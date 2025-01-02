import { context, diag, SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { _globalThis } from '@opentelemetry/core';
import { InstrumentationBase, InstrumentationNodeModuleDefinition, isWrapped } from '@opentelemetry/instrumentation';

import type { MessageTransform, PendingRequest, WebSocketInstrumentationConfig, WebSocketMessage } from './types';
import { generateRequestId, isLocalhost } from './utils';

const WS_MODULE = 'WebSocket';

const VERSION = '0.0.1';

export class WebSocketInstrumentation<T = Record<string, unknown>> extends InstrumentationBase {
  readonly component: string = 'websocket';
  readonly version: string = VERSION;

  moduleName = this.component;

  private messageTransform: MessageTransform<T>;
  private sendTransform: MessageTransform<T>;

  private pendingRequests = new Map<number, PendingRequest>();

  constructor(options: WebSocketInstrumentationConfig<T> = {}) {
    super('faro-instrumentation-websocket', VERSION, {});

    this.messageTransform = options.messageTransform ?? this.defaultTransform;
    this.sendTransform = options.sendTransform ?? this.defaultTransform;
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

  private defaultTransform(message: WebSocketMessage<T>): WebSocketMessage<T> | null | undefined {
    return message;
  }

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
          try {
            const response = JSON.parse(event.data);

            if (response.requestId && self.pendingRequests.has(response.requestId)) {
              const { span } = self.pendingRequests.get(response.requestId)!;
              span.end();

              self.pendingRequests.delete(response.requestId);
            }

            const transformedMessage = self.messageTransform(response);
            if (!transformedMessage) {
              return;
            }

            const messageSpan = tracer.startSpan(
              'websocket.receive',
              {
                kind: SpanKind.CLIENT,
                attributes: {
                  'websocket.url': url,
                  'websocket.message_payload':
                    typeof transformedMessage === 'string' ? transformedMessage : JSON.stringify(transformedMessage),
                },
              },
              this.wsContext
            );
            messageSpan.end();
          } catch (_ignored) {}
        });

        this.addEventListener('open', () => {
          this.wsSpan.setAttribute('websocket.state', 'connected');
        });

        this.addEventListener('error', (error: Event) => {
          this.wsSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'WebSocket error',
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
            const requestId = generateRequestId();
            let modifiedData;
            try {
              const payload = JSON.parse(data);
              payload.requestId = requestId;
              modifiedData = payload;
            } catch (e) {
              self._diag.debug('Failed to modify payload, not JSON:', e);

              originalSend.call(this, data);

              return;
            }

            originalSend.call(this, JSON.stringify(modifiedData));

            const transformedData = self.sendTransform(modifiedData);
            if (!transformedData) {
              return;
            }

            const sendSpan = tracer.startSpan(
              'websocket.send',
              {
                kind: SpanKind.CLIENT,
                attributes: {
                  'websocket.url': url,
                  'websocket.message_payload': JSON.stringify(transformedData),
                },
              },
              this.wsContext
            );

            self.pendingRequests.set(requestId, {
              span: sendSpan,
              startTime: Date.now(),
            });
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
