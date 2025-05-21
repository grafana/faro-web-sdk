import { startUserAction, UserActionInstrumentation } from './instrumentation';

const mockProcessUserEvent = jest.fn();
jest.mock('./processUserActionEventHandler', () => ({
  getUserEventHandler: jest.fn().mockImplementation(() => mockProcessUserEvent),
}));

const originalXMLHttpRequest = global.XMLHttpRequest;

describe('UserActionsInstrumentation', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    jest.clearAllTimers();
    global.XMLHttpRequest = originalXMLHttpRequest;
  });

  afterAll(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
  });

  it('startUserAction executes processUserEventHandler', () => {
    const userActionInstrumentation = new UserActionInstrumentation();
    userActionInstrumentation.initialize();
    startUserAction('test-action', { test: 'test-property' });

    expect(mockProcessUserEvent).toHaveBeenCalledWith({
      name: 'test-action',
      attributes: { test: 'test-property' },
      type: 'apiEvent',
    });
  });
});
