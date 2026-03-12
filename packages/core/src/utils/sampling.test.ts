import { clampSamplingRate } from './sampling';

describe('clampSamplingRate', () => {
  it('returns rates in the valid range unchanged', () => {
    expect(clampSamplingRate(0)).toBe(0);
    expect(clampSamplingRate(0.42)).toBe(0.42);
    expect(clampSamplingRate(1)).toBe(1);
  });

  it('clamps rates below 0 to 0', () => {
    expect(clampSamplingRate(-1)).toBe(0);
  });

  it('clamps rates above 1 to 1', () => {
    expect(clampSamplingRate(2)).toBe(1);
  });
});
