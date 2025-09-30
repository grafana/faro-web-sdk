import { Page } from '../../components';

import { LoginForm } from './LoginForm';

export function Login() {
  return (
    <Page title="Login" view="auth">
      <LoginForm />
    </Page>
  );
}
