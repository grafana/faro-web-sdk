import type { Meta, MetaItem } from '@grafana/faro-core';

let currentHref: string | undefined;

type createPageMetaProps = {
  generatePageId?: (location: Location) => string;
  initialPageMeta?: Meta['page'];
};

// const currentPageUrl = faro.api.getPage()?.url;

export function createPageMeta({ generatePageId, initialPageMeta }: createPageMetaProps = {}): MetaItem<
  Pick<Meta, 'page'>
> {
  const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const locationHref = location.href;
    let pageId: string | undefined;

    if (typeof generatePageId === 'function' && currentHref !== locationHref) {
      currentHref = locationHref;
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
