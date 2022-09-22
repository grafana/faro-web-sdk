import type { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';

export type PageProps = {
  children: ReactNode;
  title: string;
};

export function Page({ children, title }: PageProps) {
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
