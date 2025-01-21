import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

describe('Meta API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('setView', () => {
    it('updates the view meta if the new view meta is different to the previous one', () => {
      const { api } = initializeFaro(mockConfig());

      const view = { name: 'my-view' };
      api.setView(view);
      let previousView = api.getView();
      expect(previousView).toEqual(view);

      const newView = { name: 'my-new-view' };
      api.setView(newView);
      previousView = api.getView();
      expect(previousView).toEqual(newView);
    });

    it('does not update the view meta if the new view meta is identical to the previous one', () => {
      const { api } = initializeFaro(mockConfig());

      const view = { name: 'my-view' };
      api.setView(view);
      let previousView = api.getView();
      expect(previousView).toEqual(view);

      const newView = { name: 'my-view' };
      api.setView(newView);
      previousView = api.getView();
      expect(previousView).toEqual(view);
    });
  });

  describe('setSession', () => {
    it('adds overrides to the session meta if provided via the setView() function call', () => {
      const initialSession = { id: 'my-session' };

      const { api } = initializeFaro(mockConfig({ sessionTracking: { enabled: false, session: initialSession } }));

      expect(api.getSession()).toEqual(initialSession);

      let overrides = { serviceName: 'service-1' };

      const newSession = { id: 'my-new-session', attributes: { hello: 'world' } };
      api.setSession(newSession, { overrides });
      expect(api.getSession()).toEqual({ ...newSession, overrides });

      overrides = { serviceName: 'service-2' };
      api.setSession({}, { overrides });
      expect(api.getSession()).toEqual({ ...newSession, overrides });

      overrides = { serviceName: 'service-3' };
      api.setSession(undefined, { overrides });
      expect(api.getSession()).toEqual({ overrides });
    });
  });
});
