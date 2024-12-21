import type { Meta, MetaItem } from '@grafana/faro-core';

let currentRoute = 'startup';

export const metaPage: MetaItem<Pick<Meta, 'page'>> = () => ({
  page: {
    id: currentRoute,
    url: currentRoute,
  },
});

export function updateCurrentRoute(routeName: string): void {
  currentRoute = routeName;
}
