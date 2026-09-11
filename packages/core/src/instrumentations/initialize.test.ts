import { initializeFaro } from '../initialize';
import { mockConfig } from '../testUtils';

import { BaseInstrumentation } from './base';

class TestInstrumentation extends BaseInstrumentation {
  readonly version = '1';
  initialize = jest.fn();
  destroy = jest.fn();

  constructor(readonly name: string) {
    super();
  }
}

it('removes the selected instrumentation even when other registrations follow it', () => {
  const first = new TestInstrumentation('first');
  const later = new TestInstrumentation('later');
  const sdk = initializeFaro(mockConfig({ instrumentations: [first, later] }));

  sdk.instrumentations.remove(first);

  expect(first.destroy).toHaveBeenCalledTimes(1);
  expect(later.destroy).not.toHaveBeenCalled();
  expect(sdk.instrumentations.instrumentations).toEqual([later]);
});

it('unwinds a failed registration so it can be replaced', () => {
  const failing = new TestInstrumentation('same');
  failing.initialize.mockImplementation(() => {
    throw new Error('initialization failed');
  });
  const sdk = initializeFaro(mockConfig());
  expect(() => sdk.instrumentations.add(failing)).toThrow('initialization failed');
  expect(failing.destroy).toHaveBeenCalledTimes(1);
  const replacement = new TestInstrumentation('same');
  sdk.instrumentations.add(replacement);
  expect(sdk.instrumentations.instrumentations).toEqual([replacement]);
});

it('revokes registration before cleanup so a replacement added from cleanup survives', () => {
  const first = new TestInstrumentation('same');
  const replacement = new TestInstrumentation('same');
  const sdk = initializeFaro(mockConfig({ instrumentations: [first] }));
  first.destroy.mockImplementation(() => sdk.instrumentations.add(replacement));

  sdk.instrumentations.remove(first);

  expect(sdk.instrumentations.instrumentations).toEqual([replacement]);
  expect(replacement.initialize).toHaveBeenCalledTimes(1);
  expect(replacement.destroy).not.toHaveBeenCalled();
});

it('does not remove a replacement registered while removing several instrumentations', () => {
  const first = new TestInstrumentation('first');
  const later = new TestInstrumentation('later');
  const replacement = new TestInstrumentation('later');
  const sdk = initializeFaro(mockConfig({ instrumentations: [first, later] }));
  first.destroy.mockImplementation(() => {
    sdk.instrumentations.remove(later);
    sdk.instrumentations.add(replacement);
  });

  sdk.instrumentations.remove(first, later);

  expect(sdk.instrumentations.instrumentations).toEqual([replacement]);
  expect(later.destroy).toHaveBeenCalledTimes(1);
  expect(replacement.destroy).not.toHaveBeenCalled();
});

it('does not tear down a reinitialized instance when its older initialization fails', () => {
  const instrumentation = new TestInstrumentation('same');
  const sdk = initializeFaro(mockConfig());
  instrumentation.initialize.mockImplementationOnce(() => {
    sdk.instrumentations.remove(instrumentation);
    sdk.instrumentations.add(instrumentation);
    throw new Error('older initialization failed');
  });
  expect(() => sdk.instrumentations.add(instrumentation)).toThrow('older initialization failed');
  expect(sdk.instrumentations.instrumentations).toEqual([instrumentation]);
  expect(instrumentation.destroy).toHaveBeenCalledTimes(1);
});
