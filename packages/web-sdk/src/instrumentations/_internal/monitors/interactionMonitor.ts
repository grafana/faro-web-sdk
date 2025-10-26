import { Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_INTERACTION = 'interaction';

export type InteractionMessage = {
  type: typeof MESSAGE_TYPE_INTERACTION;
  name: string;
};

let interactionObservable: Observable<InteractionMessage> | undefined;
const registeredEventNames = new Set<string>();
const eventNameToHandler = new Map<string, (e: Event) => void>();

export function monitorInteractions(eventNames: string[]): Observable<InteractionMessage> {
  if (!interactionObservable) {
    interactionObservable = new Observable<InteractionMessage>();
  }

  eventNames.forEach((eventName) => {
    if (!registeredEventNames.has(eventName)) {
      const handler = () => {
        interactionObservable!.notify({ type: MESSAGE_TYPE_INTERACTION, name: eventName });
      };
      window.addEventListener(eventName, handler);
      registeredEventNames.add(eventName);
      eventNameToHandler.set(eventName, handler);
    }
  });

  return interactionObservable;
}

// Test-only utility to reset state between tests
export function __resetInteractionMonitorForTests() {
  eventNameToHandler.forEach((handler, eventName) => {
    window.removeEventListener(eventName, handler);
  });
  eventNameToHandler.clear();
  registeredEventNames.clear();
  interactionObservable = undefined;
}
