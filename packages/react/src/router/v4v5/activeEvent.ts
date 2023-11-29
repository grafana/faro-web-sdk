import { EVENT_ROUTE_CHANGE } from '@grafana/faro-web-sdk';

import { api } from '../../dependencies';

import type { ReactRouterV4V5ActiveEvent } from './types';

export let activeEvent: ReactRouterV4V5ActiveEvent | undefined = undefined;

export function createNewActiveEvent(url: string): ReactRouterV4V5ActiveEvent {
  activeEvent = {
    route: '',
    url,
  };

  return activeEvent;
}

export function setActiveEventRoute(route: string): void {
  if (activeEvent) {
    activeEvent.route = route;
  }
}

export function sendActiveEvent(): void {
  api.pushEvent(EVENT_ROUTE_CHANGE, activeEvent, undefined, { skipDedupe: true });

  activeEvent = undefined;
}
