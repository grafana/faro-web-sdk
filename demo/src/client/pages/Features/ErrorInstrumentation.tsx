import { Button, ButtonGroup } from 'react-bootstrap';

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

  const xhrError = () => {
    return new Promise((_resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'http://localhost:64999');
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.send();
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
        <Button data-cy="btn-fetch-error" onClick={fetchError} data-faro-user-action-name="fetch-error">
          Fetch Error
        </Button>
        <Button data-cy="btn-xhr-error" onClick={xhrError} data-faro-user-action-name="xhr-error">
          XHR Error (promise)
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
