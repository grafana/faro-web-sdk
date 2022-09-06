import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '../../hooks';
import { selectIsUserLoggedIn } from '../../store';

export type LoggedOutGuardProps = {
  children: ReactNode;
};

export function LoggedOutGuard({ children }: LoggedOutGuardProps) {
  const navigate = useNavigate();

  const isLoggedIn = useAppSelector(selectIsUserLoggedIn);

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/articles');
    }
  }, [isLoggedIn, navigate]);

  if (isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
