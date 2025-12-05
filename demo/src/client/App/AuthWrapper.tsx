import type { ReactNode } from 'react';
import { Outlet } from 'react-router';

import { useLazyGetAuthStateQuery } from '../api';
import { LoadingScreen } from '../components';
import { useIsomorphicEffect } from '../hooks';

export type AuthWrapperProps = {
  children?: ReactNode;
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

  // Support both data router (Outlet) and legacy (children) patterns
  return <>{children ?? <Outlet />}</>;
}
