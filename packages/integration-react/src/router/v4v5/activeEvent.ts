import { agent } from './dependencies';
import type { ReactRouterV4V5ActiveEvent } from './types';

export let activeEvent: ReactRouterV4V5ActiveEvent | undefined = undefined;

export function createNewActiveEvent(url: string): ReactRouterV4V5ActiveEvent {
  activeEvent = {
    url,
    route: '',
  };

  return activeEvent;
}

export function setActiveEventRoute(route: string): void {
  if (activeEvent) {
    activeEvent.route = route;
  }
}

export function sendActiveEvent(): void {
  agent.api.pushEvent('routeChange', activeEvent);

  activeEvent = undefined;
}
