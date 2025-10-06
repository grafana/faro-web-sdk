import { Button, ButtonGroup } from 'react-bootstrap';

import { faro } from '@grafana/faro-react';

export function ErrorInstrumentation() {
  const throwError = () => {
    throw new Error('This is a thrown error');
  };

  const callUndefined = () => {
    // @ts-expect-error - Intentionally calling undefined function to test error handlingx
    // eslint-disable-next-line no-undef
    test();
  };

  const fetchError = () => {
    faro.api.startUserAction('fetch-error');
    fetch('http://localhost:64999', {
      method: 'POST',
    });

    setTimeout(() => {
      faro.api.pushLog(['Fetch error log']);
      faro.api.pushError(new Error('TEST - This is a fetch error'));
    }, 80);
  };

  const xhrError = () => {
    faro.api.startUserAction('xhr-error');
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
        <Button data-cy="btn-fetch-error" onClick={fetchError}>
          Fetch Error
        </Button>
        <Button data-cy="btn-xhr-error" onClick={xhrError}>
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
