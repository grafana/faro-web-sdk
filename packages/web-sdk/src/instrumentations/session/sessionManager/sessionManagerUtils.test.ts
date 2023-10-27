import * as faroCore from '@grafana/faro-core';

import { createUserSessionObject } from './sessionManagerUtils';

const fakeSystemTime = new Date('2023-01-01').getTime();
// const mockSessionId = '123';

describe('sessionManagerUtils', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fakeSystemTime);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('creates new user session object.', () => {
    const mockNewSessionId = 'abcde';
    jest.spyOn(faroCore, 'genShortID').mockReturnValue(mockNewSessionId);

    const newSession = createUserSessionObject();

    expect(newSession).toStrictEqual({
      sessionId: mockNewSessionId, // random
      lastActivity: fakeSystemTime,
      started: fakeSystemTime,
    });
  });
});
