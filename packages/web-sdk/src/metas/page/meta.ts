import type { Meta, MetaItem } from '@grafana/faro-core';

let currentHref: string | undefined;
let currentPageId: string | undefined;

/**
 * @deprecated legacy page meta, use createPageMeta(idParser?: (location: LocationReduced) => string) instead
 */
export const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
  return {
    page: {
      url: location.href,
    },
  };
};

export function createPageMeta(idParser?: (location: Location) => string): MetaItem<Pick<Meta, 'page'>> {
  const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const locationHref = location.href;

    if (typeof idParser === 'function' && currentHref !== locationHref) {
      currentHref = locationHref;
      currentPageId = idParser(location);
    }

    return {
      page: {
        url: locationHref,
        ...(currentPageId ? { id: currentPageId } : {}),
      },
    };
  };

  return pageMeta;
}
