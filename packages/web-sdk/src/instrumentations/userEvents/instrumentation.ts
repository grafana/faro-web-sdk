import { BaseInstrumentation, VERSION } from '@grafana/faro-core';

export class UserEventsInstrumentation extends BaseInstrumentation {
  readonly name = '@grafana/faro-web-sdk:user-events';
  readonly version = VERSION;

  initialize(): void {
    // TODO: we might miss clicks bc complete is a bit later then dom content loaded but waiting for complete has less impact on load time and we can ensure to instrument elements loaded later
    // onDocumentReady(() => this.setupEventListeners());

    this.setupEventListeners();
  }

  private logInteraction = (event: Event) => {
    if (event.target) {
      console.log(
        `Event: ${event.type}, Element: ${(event.target as HTMLElement).tagName}, ID: ${(event.target as HTMLElement).id}`
      );
    }
  };

  private setupEventListeners(): void {
    // Function to log interactions

    document.querySelectorAll('button, a').forEach((element) => {
      element.addEventListener('click', this.logInteraction);
    });

    document.querySelectorAll('input, select, textarea').forEach((element) => {
      element.addEventListener('change', this.logInteraction);
    });

    document.querySelectorAll('form').forEach((form) => {
      form.addEventListener('submit', this.logInteraction);
    });
  }

  destroy() {
    document.querySelectorAll('button, a').forEach((element) => {
      element.removeEventListener('click', this.logInteraction);
    });

    document.querySelectorAll('input, select, textarea').forEach((element) => {
      element.removeEventListener('change', this.logInteraction);
    });

    document.querySelectorAll('form').forEach((form) => {
      form.removeEventListener('submit', this.logInteraction);
    });
  }
}
