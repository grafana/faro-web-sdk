import { isObject } from '@grafana/faro-core';
import type { Meta, MetaItem } from '@grafana/faro-core';

export const k6Meta: MetaItem<Pick<Meta, 'k6'>> = () => {
  const isK6Browser = isObject((window as any).k6);
  return {
    k6: {
      isK6Browser,
    },
  };
};
