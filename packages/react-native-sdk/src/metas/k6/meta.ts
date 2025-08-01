import type { Meta, MetaItem } from '@grafana/faro-core';

type K6Properties = {
  testRunId?: string;
};

export const k6Meta: MetaItem<Pick<Meta, 'k6'>> = () => {
  const k6Properties: K6Properties = (window as any).k6;

  return {
    k6: {
      // we only add the k6 meta if Faro is running inside a k6 environment, so this is always true
      isK6Browser: true,
      ...(k6Properties?.testRunId && { testRunId: k6Properties?.testRunId }),
    },
  };
};
