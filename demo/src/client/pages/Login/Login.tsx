import { useEffect } from 'react';

import { UserEventsInstrumentation } from '@grafana/faro-web-sdk/src/instrumentations/userEvents/instrumentation';

import { Page } from '../../components';

import { LoginForm } from './LoginForm';

export function Login() {
  useEffect(() => {
    const { journey } = UserEventsInstrumentation.getActiveJourneys();

    if (journey !== 'user_authentication') {
      UserEventsInstrumentation.startJourney('user_authentication');
    }
  }, []);

  return (
    <Page title="Login" view="auth">
      <LoginForm />
    </Page>
  );
}
