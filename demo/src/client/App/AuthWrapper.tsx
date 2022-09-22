import type { ReactNode } from 'react';

import { useLazyGetAuthStateQuery } from '../api';
import { LoadingScreen } from '../components';
import { useIsomorphicEffect } from '../hooks';

export type AuthWrapperProps = {
  children: ReactNode;
};

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [getAuthState, getAuthStateResult] = useLazyGetAuthStateQuery();

  useIsomorphicEffect(() => {
    if (getAuthStateResult.isUninitialized && !getAuthStateResult.isLoading) {
      getAuthState();
    }
  }, [getAuthState, getAuthStateResult]);

  if (!getAuthStateResult.isUninitialized && getAuthStateResult.isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
