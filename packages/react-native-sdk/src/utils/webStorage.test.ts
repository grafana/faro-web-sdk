import { isWebStorageAvailable } from './webStorage';

let windowSpy: jest.SpyInstance;

// TODO: adapt tests
describe('webStorage', () => {
  beforeEach(() => {
    windowSpy = jest.spyOn(globalThis, 'window', 'get');
  });

  afterEach(() => {
    windowSpy.mockRestore();
  });

  it('Returns true if local storage is available.', () => {
    const localStorageAvailable = isWebStorageAvailable('localStorage');
    expect(localStorageAvailable).toBe(true);
  });

  it('Returns false if local storage is not available.', () => {
    disableLocalStorage();
    const localStorageAvailable = isWebStorageAvailable('localStorage');
    expect(localStorageAvailable).toBe(false);
  });
});

function disableLocalStorage() {
  windowSpy.mockImplementation(() => ({
    localStorage: {
      setItem() {
        throw new Error();
      },
    },
  }));
}
