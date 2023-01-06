import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

import { faro } from '@grafana/faro-react';

export type PageProps = {
  children: ReactNode;
  title: string;
  view: string;
};

export function Page({ children, title, view }: PageProps) {
  faro?.api?.setView({ name: view });

  return (
    <>
      <Helmet>
        <title>{title} | Demo</title>
      </Helmet>

      <h2 className="mb-3">{title}</h2>

      {children}
    </>
  );
}
