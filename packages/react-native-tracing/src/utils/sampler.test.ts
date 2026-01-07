import { SamplingDecision } from '@opentelemetry/sdk-trace-base';

import { getSamplingDecision } from './sampler';

describe('Sampler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Set SamplingDecision to NOT_RECORD (0) if session is not part of the sample', () => {
    const samplingDecision = getSamplingDecision({
      attributes: {
        isSampled: 'false',
      },
    });

    expect(samplingDecision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('Set SamplingDecision to RECORD_AND_SAMPLED (2) if session is part of the sample', () => {
    const samplingDecision = getSamplingDecision({
      attributes: {
        isSampled: 'true',
      },
    });

    expect(samplingDecision).toBe(SamplingDecision.RECORD_AND_SAMPLED);
  });

  it('Set SamplingDecision to NOT_RECORD if session has no attributes', () => {
    const samplingDecision = getSamplingDecision({});

    expect(samplingDecision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('Set SamplingDecision to NOT_RECORD if session is undefined', () => {
    const samplingDecision = getSamplingDecision(undefined);

    expect(samplingDecision).toBe(SamplingDecision.NOT_RECORD);
  });

  it('Set SamplingDecision to NOT_RECORD if isSampled is missing', () => {
    const samplingDecision = getSamplingDecision({
      attributes: {
        someOtherKey: 'value',
      },
    });

    expect(samplingDecision).toBe(SamplingDecision.NOT_RECORD);
  });
});
