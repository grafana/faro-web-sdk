import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

describe('Meta API', () => {
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
    // it('updates the session meta if the new session meta is different to the previous one', () => {
    //   const initialSession = { id: 'my-session' };
    //   const { api } = initializeFaro(mockConfig({ sessionTracking: { session: initialSession } }));

    //   const newSession = { id: 'my-new-session' };
    //   api.setSession(newSession);

    //   const previousSession = api.getSession();
    //   expect(previousSession).toEqual(newSession);
    // });

    // it('does not update the session meta if the new session meta is identical to the previous one', () => {
    //   const initialSession = { id: 'my-session' };
    //   const { api } = initializeFaro(mockConfig({ sessionTracking: { session: initialSession } }));

    //   const newSession = { id: 'my-session' };
    //   api.setSession(newSession);
    //   const previousSession = api.getSession();
    //   expect(previousSession).toEqual(initialSession);
    // });

    it('adds overrides to the session meta if provided via the setView() function call', () => {
      const initialSession = { id: 'my-session' };
      const { api } = initializeFaro(mockConfig({ sessionTracking: { session: initialSession } }));

      const newSession = { id: 'my-new-session' };
      api.setSession(newSession, { overrides: { serviceName: 'foo' } });

      const previousSession = api.getSession();
      expect(previousSession).toEqual({ ...newSession, overrides: { serviceName: 'foo' } });
    });
  });
});
