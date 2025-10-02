import { Button, ButtonGroup } from 'react-bootstrap';

import { createSession, faro } from '@grafana/faro-react';
import { UserEventsInstrumentation } from '@grafana/faro-web-sdk/src/instrumentations/userEvents/instrumentation';

import { useAppDispatch } from '../../hooks';
import { setSession } from '../../store';

export function Events() {
  const dispatch = useAppDispatch();

  const captureEvent = (name: string, attributes?: Record<string, string>) => {
    faro.api.pushEvent(name, attributes);
  };

  const startNewSession = () => {
    const session = createSession();

    faro.api.setSession(session);

    dispatch(setSession(session));
  };

  const changeView = () => {
    faro.api.setView({ name: `randomly-changed-view-${Math.random()}` });
    UserEventsInstrumentation.stopJourney('testing_features_page');
  };

  return (
    <>
      <h3>Events</h3>
      <ButtonGroup>
        <Button data-cy="btn-event-without-attrs" onClick={() => captureEvent('click_button_no_attributes')}>
          Capture Click Event w/o Attributes
        </Button>
        <Button
          data-cy="btn-event-with-attrs"
          onClick={() => captureEvent('click_button_with_attributes', { foo: 'bar', baz: 'bad' })}
        >
          Capture Click Event w/ Attributes
        </Button>
        <Button data-cy="btn-new-session" onClick={startNewSession}>
          Start new session
        </Button>
        <Button data-cy="btn-change-view" onClick={changeView}>
          Change view
        </Button>
      </ButtonGroup>
    </>
  );
}
