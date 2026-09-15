import { SamplingDecision } from '@opentelemetry/sdk-trace-web';

import { getSamplingDecision, isSessionSampled } from './sampler';

describe('isSessionSampled', () => {
  it('is true when the session carries the sampled attribute', () => {
    expect(isSessionSampled({ attributes: { isSampled: 'true' } })).toBe(true);
  });

  it('is false when the session is not part of the sample', () => {
    expect(isSessionSampled({ attributes: { isSampled: 'false' } })).toBe(false);
  });

  it('is false when the session carries no attributes', () => {
    expect(isSessionSampled({ id: 'abc' })).toBe(false);
  });

  it('is false when there is no session at all', () => {
    expect(isSessionSampled()).toBe(false);
  });
});

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
});
