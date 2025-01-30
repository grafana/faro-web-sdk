import { isFunction, type Meta, type MetaItem } from '@grafana/faro-core';

let currentHref: string | undefined;
let pageId: string | undefined;

type createPageMetaProps = {
  generatePageId?: (location: Location) => string;
  initialPageMeta?: Meta['page'];
};

export function createPageMeta({ generatePageId, initialPageMeta }: createPageMetaProps = {}): MetaItem<
  Pick<Meta, 'page'>
> {
  const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
    const locationHref = location.href;

    if (isFunction(generatePageId) && currentHref !== locationHref) {
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
