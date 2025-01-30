import { faro } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

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

export function createPageMeta({ generatePageId, initialPageMeta }: createPageMetaProps = {}): MetaItem<
  Pick<Meta, 'page'>
> {
  const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const locationHref = location.href;
    const currentPageUrl = faro.api.getPage()?.url;
    let pageId: string | undefined;

    if (typeof generatePageId === 'function' && currentPageUrl !== locationHref) {
      pageId = generatePageId(location);
    }

    return {
      page: {
        url: locationHref,
        ...(pageId ? { id: pageId } : {}),
        ...initialPageMeta,
      },
    };
  };

  return pageMeta;
}
