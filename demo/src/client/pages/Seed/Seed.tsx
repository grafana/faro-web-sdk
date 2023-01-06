import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

import { faro } from '@grafana/faro-react';

import { useLazyGetSeedQuery } from '../../api';
import { Page } from '../../components';

export function Seed() {
  const [seed, seedResult] = useLazyGetSeedQuery();

  const handleSeed = () => {
    const otel = faro.api.getOTEL();

    if (otel) {
      const span = otel.trace.getTracer('default').startSpan('seeding default data');

      otel.context.with(otel.trace.setSpan(otel.context.active(), span), () => {
        faro.api.pushEvent('seed');

        faro.api.pushLog(['seeding default data...']);

        seed();

        span.end();
      });
    }
  };

  return (
    <Page title="Seed" view="system">
      <p>
        Clicking the button below will add some data to the database. This is useful to check the entire tracing
        instrumentation coming together.
      </p>

      <Button onClick={handleSeed} disabled={seedResult.isLoading} className="mb-3">
        Seed
      </Button>

      {!seedResult.isUninitialized && !seedResult.isLoading ? (
        seedResult.isError ? (
          <>
            <Alert variant="danger">{(seedResult as any).error.data.data.message}</Alert>
            <Alert variant="info">
              <b>Span ID:</b> {(seedResult as any).error.data.spanId} | <b>Trace ID:</b>{' '}
              {(seedResult as any).error.data.traceId}
            </Alert>
          </>
        ) : (
          <>
            <Alert variant="success">Seed successful!</Alert>
            <Alert variant="info">
              Span ID: {seedResult.data.spanId} | <b>Trace ID:</b> {seedResult.data.traceId}
            </Alert>
          </>
        )
      ) : null}
    </Page>
  );
}
