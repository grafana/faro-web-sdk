import { Page } from '../../components';

import { RegisterForm } from './RegisterForm';

export function Register() {
  return (
    <Page title="Register" view="auth">
      <RegisterForm />
    </Page>
  );
}
