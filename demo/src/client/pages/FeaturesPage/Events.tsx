import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import { agent, createSession } from '@grafana/agent-integration-react';

export function Events() {
  const captureEvent = (name: string, attributes?: Record<string, string>) => {
    agent.api.pushEvent(name, attributes);
  };

  const startNewSession = () => {
    agent.api.setSession(createSession());
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
      </ButtonGroup>
    </>
  );
}
