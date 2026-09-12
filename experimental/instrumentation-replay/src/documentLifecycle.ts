import { genShortID } from '@grafana/faro-core';

import type { DocumentRecordingState } from './recordingState';

const documents = new WeakMap<Document, RecordingDocument>();

/** Document lifetime outlasts instrumentation replacements and their memory handoffs. */
export class RecordingDocument {
  readonly id: string = genShortID();
  activation: object = {};
  phase: 'active' | 'pageswap' | 'suspended' = 'active';
  private readonly owners = new Map<string, DocumentRecordingState>();
  private readonly listeners = new Set<() => void>();

  constructor() {
    // These document-owned listeners retain no instrumentation. They must also
    // expire handoffs when no Replay instance is installed at departure.
    window.addEventListener('pageswap', () => this.suspend('pageswap'), { capture: true });
    window.addEventListener('pagehide', () => this.suspend('suspended'), { capture: true });
    document.addEventListener('freeze', () => this.suspend('suspended'), { capture: true });
    document.addEventListener('resume', () => this.resume(), { capture: true });
    window.addEventListener(
      'pageshow',
      (event) => {
        if (event.persisted) {
          this.resume();
        }
      },
      { capture: true }
    );
  }

  state(owner: string): DocumentRecordingState {
    let state = this.owners.get(owner);
    if (!state) {
      state = {};
      this.owners.set(owner, state);
    }
    return state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  resumeRetainedActivation(): void {
    if (this.phase === 'pageswap') {
      this.phase = 'active';
      this.notify();
    }
  }

  private suspend(phase: 'pageswap' | 'suspended'): void {
    if (this.phase === phase || this.phase === 'suspended') {
      return;
    }
    this.phase = phase;
    if (phase === 'suspended') {
      this.activation = {};
      this.owners.clear();
    }
    this.notify();
  }

  private resume(): void {
    if (this.phase === 'active') {
      return;
    }
    if (this.phase === 'pageswap') {
      this.activation = {};
      this.owners.clear();
    }
    this.phase = 'active';
    this.notify();
  }

  private notify(): void {
    for (const listener of [...this.listeners]) {
      listener();
    }
  }
}

export function getRecordingDocument(): RecordingDocument {
  let state = documents.get(document);
  if (!state) {
    state = new RecordingDocument();
    documents.set(document, state);
  }
  return state;
}
