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

type createPageMetaProps = {
  generatePageId?: (location: Location) => string;
  initialPageMeta?: Meta['page'];
};

export function createPageMeta({ generatePageId }: createPageMetaProps = {}): MetaItem<Pick<Meta, 'page'>> {
  const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const locationHref = location.href;

    if (typeof generatePageId === 'function' && currentHref !== locationHref) {
      currentHref = locationHref;
      currentPageId = generatePageId(location);
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
