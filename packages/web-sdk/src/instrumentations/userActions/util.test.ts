import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import { convertDataAttributeName, isRequestEndMessage, isRequestStartMessage } from './util';

describe('util', () => {
  it('converts data attribute to camelCase and remove the "data-" prefix', () => {
    expect(convertDataAttributeName('data-test-action-name')).toBe('testActionName');
  });

  it('isRequestStartMessage type guard', () => {
    const msg = { type: MESSAGE_TYPE_HTTP_REQUEST_START };
    expect(isRequestStartMessage(msg)).toBe(true);
    expect(isRequestEndMessage(msg)).toBe(false);
  });

  it('isRequestEndMessage type guard', () => {
    const msg = { type: MESSAGE_TYPE_HTTP_REQUEST_END };
    expect(isRequestEndMessage(msg)).toBe(true);
    expect(isRequestStartMessage(msg)).toBe(false);
  });
});
