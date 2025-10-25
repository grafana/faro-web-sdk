import { Observable } from '@grafana/faro-core';

export const MESSAGE_TYPE_INTERACTION = 'interaction';

export type InteractionMessage = {
  type: typeof MESSAGE_TYPE_INTERACTION;
  name: string;
};

export function monitorInteractions(eventNames: string[]): Observable {
  const observable = new Observable<InteractionMessage>();

  eventNames.forEach((eventName) => {
    window.addEventListener(eventName, () => {
      observable.notify({ type: MESSAGE_TYPE_INTERACTION, name: eventName });
    });
  });

  return observable;
}
