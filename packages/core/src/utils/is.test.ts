import { isEmpty } from './is';

describe('Meta API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('isEmpty() determines the empty state of a given  value', () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
    expect(isEmpty('')).toBe(true);
    expect(isEmpty([])).toBe(true);
    expect(isEmpty({})).toBe(true);

    expect(isEmpty(0)).toBe(false);
    expect(isEmpty('0')).toBe(false);
    expect(isEmpty([0])).toBe(false);
    expect(isEmpty({ key: 'value' })).toBe(false);
  });
});
