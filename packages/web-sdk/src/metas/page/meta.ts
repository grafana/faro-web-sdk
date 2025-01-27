import type { Meta, MetaItem } from '@grafana/faro-core';

type LocationReduced = Pick<
  Location,
  'hash' | 'host' | 'hostname' | 'href' | 'origin' | 'pathname' | 'port' | 'protocol'
>;

type ExtendLocation = Location & {
  pageId?: string;
};

// TODO: this needs to be injected via config
function myCustomParser(location: LocationReduced): string {
  console.log('myCustomParser::location :>> ', location);
  return 'marco';
}

export const pageMeta: MetaItem<Pick<Meta, 'page'>> = () => {
  const { href, pageId } = new Proxy<ExtendLocation>(location, extendedLocationHandler);

  return {
    page: {
      url: href,
      ...(pageId ? { pageId } : {}),
    },
  };
};

const extendedLocationHandler = {
  get(target: ExtendLocation, property: string) {
    const _target = { ...target };

    // TODO: myCustomParser needs to be injected via config
    if (typeof myCustomParser === 'function') {
      const { hash, host, hostname, href, origin, pathname, port, protocol } = target;
      _target['pageId'] = myCustomParser({ hash, host, hostname, href, origin, pathname, port, protocol });
    }

    return _target[property as keyof ExtendLocation];
  },
};
