import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

export type PageProps = {
  children: ReactNode;
  title: string;
  view: string;
};

export function Page({ children, title, view }: PageProps) {

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
