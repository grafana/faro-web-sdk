import type { Meta, MetaItem } from '@grafana/faro-core';

import type { NavigationState } from './types';

export const navigationState: NavigationState = {
  activeSpan: undefined,
  fromRoute: 'startup',
  isInitialized: false, // Not used yet
  stateChangeTimeout: undefined,
};

export const metaPage: MetaItem<Pick<Meta, 'page'>> = () => ({
  page: {
    id: navigationState.fromRoute,
    url: navigationState.fromRoute,
  },
});
