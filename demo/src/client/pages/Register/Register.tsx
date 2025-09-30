import { useEffect } from 'react';

import { UserEventsInstrumentation } from '@grafana/faro-web-sdk/src/instrumentations/userEvents/instrumentation';

import { Page } from '../../components';

import { RegisterForm } from './RegisterForm';

export function Register() {
  useEffect(() => {
    const { journey } = UserEventsInstrumentation.getActiveJourneys();

    if (journey !== 'user_authentication') {
      UserEventsInstrumentation.startJourney('user_authentication');
    }
  }, []);

  return (
    <Page title="Register" view="auth">
      <RegisterForm />
    </Page>
  );
}
