import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAppSelector } from '../../hooks';
import { selectIsUserLoggedIn } from '../../store';

export type LoggedInGuardProps = {
  children: ReactNode;
};

export function LoggedInGuard({ children }: LoggedInGuardProps) {
  const navigate = useNavigate();

  const isLoggedIn = useAppSelector(selectIsUserLoggedIn);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth/login');
    }
  }, [isLoggedIn, navigate]);

  if (!isLoggedIn) {
    return null;
  }

  return <>{children}</>;
}
