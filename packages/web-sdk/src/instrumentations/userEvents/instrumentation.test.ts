import { faro } from '@grafana/faro-core';

import { UserEventsInstrumentation } from './instrumentation';

// Mock faro
jest.mock('@grafana/faro-core', () => ({
  BaseInstrumentation: class {},
  faro: {
    api: {
      pushEvent: jest.fn(),
    },
  },
  VERSION: '1.0.0',
}));

describe('UserEventsInstrumentation', () => {
  let instrumentation: UserEventsInstrumentation;
  let mockPushEvent: jest.MockedFunction<typeof faro.api.pushEvent>;

  beforeEach(() => {
    instrumentation = new UserEventsInstrumentation();
    mockPushEvent = faro.api.pushEvent as jest.MockedFunction<typeof faro.api.pushEvent>;
    mockPushEvent.mockClear();
  });

  afterEach(() => {
    instrumentation.destroy();
    document.body.innerHTML = '';
  });

  describe('initialization', () => {
    it('should setup event listeners on initialize', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      instrumentation.initialize();

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function), true);
      expect(addEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function), true);
    });
  });

  describe('event logging', () => {
    beforeEach(() => {
      instrumentation.initialize();
    });

    it('should log click events with button text', () => {
      const button = document.createElement('button');
      button.innerText = 'Submit';
      document.body.appendChild(button);

      button.click();

      expect(mockPushEvent).toHaveBeenCalledWith(
        'user.interaction',
        {
          event: 'click',
          element: 'button',
          identifier: 'Submit',
        },
        undefined,
        { skipDedupe: true }
      );
    });

    it('should log click events with element id when no text', () => {
      const div = document.createElement('div');
      div.id = 'test-div';
      document.body.appendChild(div);

      div.click();

      expect(mockPushEvent).toHaveBeenCalledWith(
        'user.interaction',
        {
          event: 'click',
          element: 'div',
          identifier: 'test-div',
        },
        undefined,
        { skipDedupe: true }
      );
    });

    it('should log click events with className when no text or id', () => {
      const span = document.createElement('span');
      span.className = 'test-class';
      document.body.appendChild(span);

      span.click();

      expect(mockPushEvent).toHaveBeenCalledWith(
        'user.interaction',
        {
          event: 'click',
          element: 'span',
          identifier: 'test-class',
        },
        undefined,
        { skipDedupe: true }
      );
    });

    it('should log change events', () => {
      const input = document.createElement('input');
      input.id = 'test-input';
      document.body.appendChild(input);

      input.dispatchEvent(new Event('change', { bubbles: true }));

      expect(mockPushEvent).toHaveBeenCalledWith(
        'user.interaction.change',
        {
          event: 'change',
          element: 'input',
          identifier: 'test-input',
        },
        undefined,
        { skipDedupe: true }
      );
    });

    it('should log submit events', () => {
      const form = document.createElement('form');
      form.id = 'test-form';
      document.body.appendChild(form);

      form.dispatchEvent(new Event('submit', { bubbles: true }));

      expect(mockPushEvent).toHaveBeenCalledWith(
        'user.interaction.submit',
        {
          event: 'submit',
          element: 'form',
          identifier: 'test-form',
        },
        undefined,
        { skipDedupe: true }
      );
    });

    it('should not log events without target', () => {
      const event = new Event('click');
      Object.defineProperty(event, 'target', { value: null });

      document.dispatchEvent(event);

      expect(mockPushEvent).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      instrumentation.initialize();

      instrumentation.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function), true);
      expect(removeEventListenerSpy).toHaveBeenCalledWith('submit', expect.any(Function), true);
    });

    it('should not log events after destroy', () => {
      instrumentation.initialize();
      instrumentation.destroy();

      const button = document.createElement('button');
      button.innerText = 'Test';
      document.body.appendChild(button);
      button.click();

      expect(mockPushEvent).not.toHaveBeenCalled();
    });
  });
});
