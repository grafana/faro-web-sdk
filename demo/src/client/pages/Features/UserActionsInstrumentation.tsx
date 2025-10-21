import { Button, ButtonGroup } from 'react-bootstrap';

import { faro } from '@grafana/faro-react';

export function UserActionsInstrumentation() {
  const userAction1 = () => {
    faro.api.startUserAction('user-action-1');

    faro.api.pushEvent('user-action-1-custom-event-1');

    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/long-running-request?delay=1000');
    xhr.send();

    setTimeout(() => {
      faro.api.pushEvent('user-action-1-custom-event-2');
    }, 500);
  };

  return (
    <>
      <h3>User Actions Instrumentation</h3>
      <ButtonGroup>
        <Button data-cy="btn-ua-1" onClick={userAction1}>
          Event when halted
        </Button>
      </ButtonGroup>
    </>
  );
}
