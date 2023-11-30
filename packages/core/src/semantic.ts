/**
 * @deprecated The conventions object will be removed in a future version
 */
export const Conventions = {
  /**
   * @deprecated The event names object will be removed in a future version
   */
  EventNames: {
    CLICK: 'click',
    NAVIGATION: 'navigation',
    SESSION_START: 'session_start',
    VIEW_CHANGED: 'view_changed',
  },
} as const;

export const EVENT_CLICK = 'click';
export const EVENT_NAVIGATION = 'navigation';
export const EVENT_VIEW_CHANGED = 'view_changed';
export const EVENT_SESSION_START = 'session_start';
export const EVENT_SESSION_RESUME = 'session_resume';
export const EVENT_SESSION_EXTEND = 'session_extend';
export const EVENT_ROUTE_CHANGE = 'route_change';
