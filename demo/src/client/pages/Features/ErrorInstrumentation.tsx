import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import { faro } from '@grafana/faro-react';

export function ErrorInstrumentation() {
  const throwError = () => {
    throw new Error('This is a thrown error');
  };

  const callUndefined = () => {
    // @ts-ignore
    test();
  };

  const fetchError = () => {
    fetch('http://localhost:64999', {
      method: 'POST',
    });
  };

  const promiseReject = () => {
    new Promise((_accept, reject) => {
      reject('This is a rejected promise');
    });
  };

  const pushError = () => {
    faro.api.pushError(new Error('This is a manually generated error'));
  };

  return (
    <>
      <h3>Error Instrumentation</h3>
      <ButtonGroup>
        <Button data-cy="btn-throw-error" onClick={throwError}>
          Throw Error
        </Button>
        <Button data-cy="btn-call-undefined" onClick={callUndefined}>
          Call Undefined Method
        </Button>
        <Button data-cy="btn-fetch-error" onClick={fetchError}>
          Fetch Error
        </Button>
        <Button data-cy="btn-promise-reject" onClick={promiseReject}>
          Promise Reject
        </Button>
        <Button data-cy="btn-push-error" onClick={pushError}>
          Push an Error
        </Button>
      </ButtonGroup>
    </>
  );
}
