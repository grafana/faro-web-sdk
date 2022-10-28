import Button from 'react-bootstrap/Button';
import ButtonGroup from 'react-bootstrap/ButtonGroup';

import { faro } from '@grafana/faro-react';

export function MetricsMeasurements() {
  const sendCustomMetric = () => {
    faro.api.pushMeasurement({
      type: 'custom',
      values: {
        my_custom_metric: Math.random(),
      },
    });
  };

  return (
    <>
      <h3>Metrics Measurements</h3>
      <ButtonGroup>
        <Button data-cy="btn-send-custom-metric" onClick={sendCustomMetric}>
          Send Custom Metric
        </Button>
      </ButtonGroup>
    </>
  );
}
