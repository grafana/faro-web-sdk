import type { Meta, MetaItem } from '@grafana/faro-core';

export const k6Meta: MetaItem<Pick<Meta, 'k6'>> = () => {
  return {
    k6: {},
  };
};
