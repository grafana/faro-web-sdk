import { getWebInstrumentations } from './getWebInstrumentations';

const navigationInstrumentationName = '@grafana/faro-web-sdk:instrumentation-navigation';

describe('getWebInstrumentations', () => {
  it('includes navigation instrumentation by default', () => {
    const instrumentations = getWebInstrumentations();

    expect(instrumentations.some(({ name }) => name === navigationInstrumentationName)).toBe(true);
  });

  it('excludes navigation instrumentation when trackNavigation is false', () => {
    const instrumentations = getWebInstrumentations({ trackNavigation: false });

    expect(instrumentations.some(({ name }) => name === navigationInstrumentationName)).toBe(false);
  });
});
