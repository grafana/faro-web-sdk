import { MESSAGE_TYPE_HTTP_REQUEST_END, MESSAGE_TYPE_HTTP_REQUEST_START } from './const';
import {
  convertDataAttributeName,
  deriveUserActionTimeoutDataAttribute,
  isRequestEndMessage,
  isRequestStartMessage,
  normalizeDataAttributeName,
  normalizeInitialActivityTimeout,
} from './util';

describe('util', () => {
  it('converts data attribute to camelCase and remove the "data-" prefix', () => {
    expect(convertDataAttributeName('data-test-action-name')).toBe('testActionName');
  });

  it.each([
    ['data-test-action-name', 'data-test-action-name'],
    ['testActionName', 'data-test-action-name'],
  ])('normalizes the action attribute %s to HTML form', (input, expected) => {
    expect(normalizeDataAttributeName(input)).toBe(expected);
  });

  it.each([
    ['data-test-action-name', 'data-test-action-timeout'],
    ['testActionName', 'data-test-action-timeout'],
    ['data-test-action', 'data-test-action-timeout'],
  ])('derives the timeout attribute for %s', (input, expected) => {
    expect(deriveUserActionTimeoutDataAttribute(input)).toBe(expected);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'warns and falls back for an invalid initial activity timeout: %s',
    (input) => {
      const warn = jest.fn();

      expect(normalizeInitialActivityTimeout(input, 250, warn)).toBe(250);
      expect(warn).toHaveBeenCalledTimes(1);
    }
  );

  it('accepts a valid initial activity timeout', () => {
    expect(normalizeInitialActivityTimeout(450)).toBe(450);
  });

  it('warns and clamps an initial activity timeout above the maximum', () => {
    const warn = jest.fn();

    expect(normalizeInitialActivityTimeout(1001, 100, warn)).toBe(1000);
    expect(warn).toHaveBeenCalledTimes(1);
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
