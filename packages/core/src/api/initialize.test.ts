import { mockConfig, mockInternalLogger } from '../testUtils';
import { unpatchedConsole } from '../unpatchedConsole/initialize';

import { mockMetas, mockTransports } from './apiTestHelpers';
import { initializeAPI } from './initialize';

describe('initialize', () => {
  it('should initialize the API', () => {
    const api = initializeAPI(unpatchedConsole, mockInternalLogger, mockConfig(), mockMetas, mockTransports);

    expect(api).toBeDefined();
    expect(api).toHaveProperty('pushError');
    expect(api).toHaveProperty('pushLog');
    expect(api).toHaveProperty('pushMeasurement');
    expect(api).toHaveProperty('pushTraces');
    expect(api).toHaveProperty('pushEvent');
    expect(api).toHaveProperty('changeStacktraceParser');
    expect(api).toHaveProperty('getOTEL');
    expect(api).toHaveProperty('getPage');
    expect(api).toHaveProperty('getSession');
    expect(api).toHaveProperty('getStacktraceParser');
    expect(api).toHaveProperty('getTraceContext');
    expect(api).toHaveProperty('getView');
    expect(api).toHaveProperty('initOTEL');
    expect(api).toHaveProperty('isOTELInitialized');
    expect(api).toHaveProperty('resetSession');
    expect(api).toHaveProperty('resetUser');
    expect(api).toHaveProperty('setSession');
    expect(api).toHaveProperty('setUser');
    expect(api).toHaveProperty('setPage');
    expect(api).toHaveProperty('setView');
  });
});
