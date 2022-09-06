import { Suspense } from 'react';
import type { Attributes, ComponentType } from 'react';

import { LoadingScreen } from '../components/LoadingScreen';

export function Loadable<P extends Attributes>(Component: ComponentType<P>) {
  // eslint-disable-next-line react/display-name
  return (props: P) => {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <Component {...props} />
      </Suspense>
    );
  };
}
