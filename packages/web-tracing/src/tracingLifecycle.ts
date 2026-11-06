import { trace } from '@opentelemetry/api';
import type { Context } from '@opentelemetry/api';
import { ExportResultCode } from '@opentelemetry/core';
import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, Span, SpanExporter, SpanProcessor } from '@opentelemetry/sdk-trace-web';

export interface TracingLifecycleProvider {
  forceFlush(): Promise<void>;
  shutdown(): Promise<void>;
}

export type TracingLifecycleState = 'active' | 'draining' | 'expired' | 'completed';

/**
 * Keeps an app's original tracing pipeline alive while already-started work drains. The lifecycle
 * deliberately owns one deadline for both request completion and the final provider flush.
 */
export class TracingLifecycle {
  private state: TracingLifecycleState = 'active';
  private pendingSpans = 0;
  private pendingExports = 0;
  private flushInFlight = false;
  private drainTimer: ReturnType<typeof setTimeout> | undefined;
  private provider: TracingLifecycleProvider | undefined;
  private readonly trackedSpans = new WeakSet<object>();
  private readonly auxiliaryParents = new WeakSet<object>();

  constructor(
    private readonly timeoutMs: number,
    private readonly onComplete: () => void
  ) {}

  get currentState(): TracingLifecycleState {
    return this.state;
  }

  get isExpired(): boolean {
    return this.state === 'expired' || this.state === 'completed';
  }

  canStart(): boolean {
    return this.state === 'active';
  }

  allowAuxiliarySpan(parent: object): void {
    this.auxiliaryParents.add(parent);
  }

  startSpan(span: object, allowDuringDrain = false): boolean {
    if (!this.canStart() && !(this.state === 'draining' && allowDuringDrain)) {
      return false;
    }

    this.trackedSpans.add(span);
    this.pendingSpans += 1;
    return true;
  }

  canStartAuxiliary(parent: object): boolean {
    return this.state === 'draining' && this.auxiliaryParents.has(parent);
  }

  hasSpan(span: object): boolean {
    return this.trackedSpans.has(span);
  }

  endSpan(span: object): boolean {
    if (!this.trackedSpans.delete(span)) {
      return false;
    }

    this.pendingSpans = Math.max(0, this.pendingSpans - 1);
    this.tryFinish();
    return true;
  }

  beginDrain(provider: TracingLifecycleProvider): void {
    if (this.state !== 'active') {
      return;
    }

    this.state = 'draining';
    this.provider = provider;

    if (this.timeoutMs === 0) {
      this.expire();
      return;
    }

    this.drainTimer = setTimeout(() => this.expire(), this.timeoutMs);
    if (typeof this.drainTimer !== 'number' && typeof this.drainTimer.unref === 'function') {
      this.drainTimer.unref();
    }
    this.tryFinish();
  }

  expire(): void {
    if (this.state !== 'draining') {
      return;
    }

    this.state = 'expired';
    this.clearDrainTimer();
    this.pendingSpans = 0;
    this.pendingExports = 0;
    this.flushInFlight = false;
    void this.provider?.shutdown().catch(() => undefined);
    this.onComplete();
  }

  private tryFinish(): void {
    if (this.state !== 'draining' || this.pendingSpans !== 0 || this.flushInFlight) {
      return;
    }

    const provider = this.provider;
    if (!provider) {
      this.complete();
      return;
    }

    this.flushInFlight = true;
    this.pendingExports = 1;
    void provider.forceFlush().then(
      () => this.finishFlush(),
      () => this.finishFlush()
    );
  }

  private finishFlush(): void {
    if (this.pendingExports === 0) {
      return;
    }

    this.flushInFlight = false;
    this.pendingExports = 0;

    if (this.state === 'draining' && this.pendingSpans === 0) {
      this.complete();
    }
  }

  private complete(): void {
    if (this.state !== 'draining') {
      return;
    }

    this.state = 'completed';
    this.clearDrainTimer();
    void this.provider?.shutdown().catch(() => undefined);
    this.onComplete();
  }

  private clearDrainTimer(): void {
    if (this.drainTimer !== undefined) {
      clearTimeout(this.drainTimer);
      this.drainTimer = undefined;
    }
  }
}

/**
 * Tracks recording spans independently of the registry state. Once a registration drains, spans
 * already tracked by this processor may finish, while newly-created spans and late completions are
 * discarded without reaching the original exporter.
 */
export class TracingLifecycleExporter implements SpanExporter {
  constructor(
    private readonly exporter: SpanExporter,
    private readonly lifecycle: TracingLifecycle
  ) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    if (this.lifecycle.isExpired) {
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }

    this.exporter.export(spans, resultCallback);
  }

  shutdown(): Promise<void> {
    return this.exporter.shutdown();
  }
}

export class TracingLifecycleSpanProcessor implements SpanProcessor {
  constructor(
    private readonly processor: SpanProcessor,
    private readonly lifecycle: TracingLifecycle
  ) {}

  forceFlush(): Promise<void> {
    return this.lifecycle.isExpired ? Promise.resolve() : this.processor.forceFlush();
  }

  onStart(span: Span, parentContext: Context): void {
    const parentSpan =
      parentContext && typeof (parentContext as { getValue?: unknown }).getValue === 'function'
        ? trace.getSpan(parentContext)
        : undefined;
    if (this.lifecycle.startSpan(span, parentSpan ? this.lifecycle.canStartAuxiliary(parentSpan) : false)) {
      this.processor.onStart(span, parentContext);
    }
  }

  onEnd(span: ReadableSpan): void {
    const tracked = this.lifecycle.hasSpan(span);
    if (tracked && !this.lifecycle.isExpired) {
      this.processor.onEnd(span);
    }

    if (tracked) {
      this.lifecycle.endSpan(span);
    }
  }

  shutdown(): Promise<void> {
    return this.processor.shutdown();
  }
}
