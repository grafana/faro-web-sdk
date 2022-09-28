import Container from 'react-bootstrap/Container';

import { Page } from '../../components';
import { ConsoleInstrumentation } from './ConsoleInstrumentation';
import { ErrorInstrumentation } from './ErrorInstrumentation';
import { Events } from './Events';
import { MetricsMeasurements } from './MetricsMeasurements';
import { TracingInstrumentation } from './TracingInstrumentation';

export function Features() {
  return (
    <Page title="Features">
      <Container as="article" className="pb-4 mb-4 border-bottom">
        <ConsoleInstrumentation />
      </Container>

      <Container as="article" className="pb-4 mb-4 border-bottom">
        <ErrorInstrumentation />
      </Container>

      <Container as="article" className="pb-4 mb-4 border-bottom">
        <TracingInstrumentation />
      </Container>

      <Container as="article" className="pb-4 mb-4 border-bottom">
        <MetricsMeasurements />
      </Container>

      <Container as="article" className="pb-4 mb-4 border-bottom">
        <Events />
      </Container>
    </Page>
  );
}
