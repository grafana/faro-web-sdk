import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

export class UserEventsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:user-events';
  readonly version = VERSION;

  initialize(): void {
    this.setupEventListeners();
  }

  private logUserInteraction = (event: Event) => {
    if (event.target) {
      const eventType = event.type;
      const targetElement = event.target as HTMLButtonElement;
      const elementType = targetElement.tagName.toLowerCase();
      const elementIdentifier = targetElement.innerText || targetElement.id || targetElement.className;

      faro.api.pushEvent(
        `faro.user.interaction-${eventType}`,
        {
          event: eventType,
          element: elementType,
          identifier: elementIdentifier,
        },
        undefined,
        { skipDedupe: true }
      );
    }
  };

  private setupEventListeners(): void {
    document.addEventListener('click', this.logUserInteraction, true);
    document.addEventListener('change', this.logUserInteraction, true);
    document.addEventListener('submit', this.logUserInteraction, true);
  }

  destroy() {
    document.removeEventListener('click', this.logUserInteraction, true);
    document.removeEventListener('change', this.logUserInteraction, true);
    document.removeEventListener('submit', this.logUserInteraction, true);
  }
}
