import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

export class UserEventsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:user-events';
  readonly version = VERSION;

  initialize(): void {
    this.setupEventListeners();
  }

  private logInteraction = (event: Event) => {
    if (event.target) {
      const eventType = event.type;
      const targetElement = event.target as HTMLButtonElement;
      const elementType = targetElement.tagName.toLowerCase();
      const elementIdentifier = targetElement.innerText || targetElement.id || targetElement.className;

      faro.api.pushEvent(
        `user-interaction-${eventType}`,
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
    document.addEventListener('click', this.logInteraction, true);
    document.addEventListener('change', this.logInteraction, true);
    document.addEventListener('submit', this.logInteraction, true);
  }

  destroy() {
    document.removeEventListener('click', this.logInteraction, true);
    document.removeEventListener('change', this.logInteraction, true);
    document.removeEventListener('submit', this.logInteraction, true);
  }
}
