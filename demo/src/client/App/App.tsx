import { Router } from '../router';

import { AuthWrapper } from './AuthWrapper';

export function App() {
  return (
    <AuthWrapper>
      <Router />
    </AuthWrapper>
  );
}
