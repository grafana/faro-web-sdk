import type { ReactNode } from 'react';

import { useLazyGetAuthStateQuery } from '../api';
import { LoadingScreen } from '../components/LoadingScreen';
import { useAppDispatch, useIsomorphicEffect } from '../hooks';
import { setUser } from '../store';

export type AuthWrapperProps = {
  children: ReactNode;
};

export function AuthWrapper({ children }: AuthWrapperProps) {
  const dispatch = useAppDispatch();

  const [getAuthState, getAuthStateResult] = useLazyGetAuthStateQuery();

  useIsomorphicEffect(() => {
    if (getAuthStateResult.isUninitialized && !getAuthStateResult.isLoading) {
      getAuthState();
    }
  }, [getAuthState, getAuthStateResult]);

  useIsomorphicEffect(() => {
    if (!getAuthStateResult.isUninitialized && !getAuthStateResult.isLoading && !getAuthStateResult.isError) {
      dispatch(setUser(getAuthStateResult.data));
    }
  }, [dispatch, getAuthStateResult]);

  if (!getAuthStateResult.isUninitialized && getAuthStateResult.isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}
