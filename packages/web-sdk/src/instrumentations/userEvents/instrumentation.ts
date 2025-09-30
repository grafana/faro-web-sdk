import { BaseInstrumentation, faro, VERSION } from '@grafana/faro-core';

import * as webStorage from '../../utils/webStorage';

import { FARO_JOURNEY_KEY, FARO_SUB_JOURNEYS_KEY } from './const';

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
        'faro.user.interaction',
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

  // TODO: this needs to be provided by core sdk for MFE support
  static startJourney(name: string) {
    console.info('Starting journey', name);
    webStorage.setItem(FARO_JOURNEY_KEY, name, 'localStorage');
    updateUserMeta({ journey: name });
  }

  // TODO: this needs to be provided by core sdk for MFE support
  static stopJourney() {
    console.info('Stopping journey');
    webStorage.removeItem(FARO_JOURNEY_KEY, 'localStorage');

    updateUserMeta({ journey: undefined, subJourneys: undefined });
  }

  static startSubJourney(name: string) {
    if (!webStorage.getItem(FARO_JOURNEY_KEY, 'localStorage')?.trim()) {
      console.warn('No active journey found. Please start a journey first.');
      return;
    }

    console.info('Starting sub-journey', name);
    const subJourneys = JSON.parse(webStorage.getItem(FARO_SUB_JOURNEYS_KEY, 'localStorage') ?? '[]') as string[];
    const updatedSubJourneys = [...subJourneys, name];
    webStorage.setItem(FARO_SUB_JOURNEYS_KEY, JSON.stringify(updatedSubJourneys), 'localStorage');

    updateUserMeta({ subJourneys: updatedSubJourneys });
  }

  // TODO: this needs to be provided by core sdk for MFE support
  static stopSubJourney(name: string) {
    console.info('Stopping sub-journey', name);
    const subJourneys = JSON.parse(webStorage.getItem(FARO_SUB_JOURNEYS_KEY, 'localStorage') ?? '[]') as string[];

    if (subJourneys.includes(name)) {
      webStorage.setItem(
        FARO_SUB_JOURNEYS_KEY,
        JSON.stringify(subJourneys.splice(subJourneys.indexOf(name), 1)),
        'localStorage'
      );

      updateUserMeta({ subJourneys });
    }
  }

  static getActiveJourneys() {
    return {
      journey: webStorage.getItem(FARO_JOURNEY_KEY, 'localStorage'),
      subJourneys: (JSON.parse(webStorage.getItem(FARO_SUB_JOURNEYS_KEY, 'localStorage') ?? '[]') as string[])[0],
    };
  }
}

function updateUserMeta({ journey, subJourneys }: { journey?: string; subJourneys?: string[] }) {
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
      ...(subJourneys ? { subJourney: subJourneys.at(-1) } : {}),
    },
  });
}
