import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';
import Form from 'react-bootstrap/Form';

import { faro, LogLevel } from '@grafana/faro-react';

export function ConsoleInstrumentation() {
  const [isApiMode, setIsApiMode] = useState(false);

  const printToConsole = (method: LogLevel) => {
    // eslint-disable-next-line no-console
    console[method](`This is a console ${method} message`);
  };

  const sendToApi = (method: LogLevel) => {
    faro.api.pushLog([`This is a console ${method} message`], {
      level: method,
    });
  };

  const execute = (method: LogLevel) => {
    if (isApiMode) {
      sendToApi(method);
    } else {
      printToConsole(method);
    }
  };

  return (
    <>
      <h3>Console Instrumentation</h3>
      <Form.Group>
        <Form.Check type="switch" label="API Mode" onChange={() => setIsApiMode(!isApiMode)} />
        <Form.Text>
          By checking this, the messages are send directly to the Faro API instead of printing to console
        </Form.Text>
      </Form.Group>
      <ButtonGroup>
        <Button data-cy="btn-log-trace" onClick={() => execute(LogLevel.TRACE)}>
          Trace
        </Button>
        <Button data-cy="btn-log-info" onClick={() => execute(LogLevel.INFO)}>
          Info
        </Button>
        <Button data-cy="btn-log-log" onClick={() => execute(LogLevel.LOG)}>
          Log
        </Button>
        <Button data-cy="btn-log-warn" onClick={() => execute(LogLevel.WARN)}>
          Warn
        </Button>
        <Button data-cy="btn-log-error" onClick={() => execute(LogLevel.ERROR)}>
          Error
        </Button>
      </ButtonGroup>
    </>
  );
}
