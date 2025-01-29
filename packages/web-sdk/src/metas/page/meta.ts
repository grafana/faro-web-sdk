import type { Meta, MetaItem } from '@grafana/faro-core';

type ExtendLocation = Location & {
  pageId?: string;
};

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
    const { href, pageId } = new Proxy<ExtendLocation>(location, {
      get(target: ExtendLocation, property: string) {
        const _target = { ...target };
        const targetHref = target.href;

        if (typeof idParser === 'function' && currentHref !== targetHref) {
          currentHref = targetHref;
          currentPageId = idParser(target);
        }

        _target.pageId = currentPageId;

        return _target[property as keyof ExtendLocation];
      },
    });

    return {
      page: {
        url: href,
        id: pageId,
      },
    };
  };

  return pageMeta;
}
