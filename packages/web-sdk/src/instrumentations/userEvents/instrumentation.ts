import { BaseInstrumentation, dateNow, faro, VERSION } from '@grafana/faro-core';

import * as webStorage from '../../utils/webStorage';

import { FARO_JOURNEY_KEY } from './const';

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

      const currentJourney = localStorage.getItem(FARO_JOURNEY_KEY);

      faro.api.pushEvent(
        `faro.user.interaction.${eventType}`,
        {
          event: eventType,
          element: elementType,
          identifier: elementIdentifier,
          ...(currentJourney ? { journey: currentJourney } : {}),
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

  static startJourney(name: string) {
    console.info('Starting journey', name);

    const timestamp = dateNow().toString();
    faro.api.pushEvent('faro.user.journey.start', { journey: name, timestamp });
    webStorage.setItem(FARO_JOURNEY_KEY, name, 'localStorage');
    updateUserMeta({ journey: name });
  }

  static stopJourney(name: string) {
    console.info('Stopping journey', name);
    faro.api.pushEvent('faro.user.journey.stop', {
      journey: name,
    });

    webStorage.removeItem(FARO_JOURNEY_KEY, 'localStorage');
    updateUserMeta({ journey: undefined });
  }

  static getActiveJourneys() {
    return {
      journey: webStorage.getItem(FARO_JOURNEY_KEY, 'localStorage'),
    };
  }
}

function updateUserMeta({ journey }: { journey?: string }) {
  const currentUserMeta = faro.metas.value.user;

  if (!currentUserMeta) {
    return;
  }

  const currentAttributes = currentUserMeta.attributes || {};

  faro.api.setUser({
    ...currentUserMeta,
    attributes: {
      ...currentAttributes,
      ...(journey ? { journey } : {}),
    },
  });
}
