import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

const originalWindow = window;

describe('Meta API', () => {
  const mockUrl = 'http://dummy.com';

  beforeEach(() => {
    window = Object.create(window);
    Object.defineProperty(window, 'location', {
      value: {
        href: mockUrl,
      },
      writable: true, // possibility to override
    });
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    window = originalWindow;
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
      expect(api.getSession()).toEqual({ overrides });

      overrides = { serviceName: 'service-3' };
      api.setSession(undefined, { overrides });
      expect(api.getSession()).toEqual({ overrides });
    });

    it('merges the new overrides with the existing session meta overrides', () => {
      const initialSession = { id: 'my-session' };

      const mc = mockConfig({
        sessionTracking: {
          session: initialSession,
        },
        trackGeolocation: false,
      });

      // mockConfig is the result of calling makeCoreConfig in faro-web-sdk package.
      // It it reads the geoLocationTracking properties it adds them to the sessionTracking.session.overrides object.
      mc.sessionTracking!.session!.overrides = { geoLocationTrackingEnabled: false };

      const { api } = initializeFaro(mc);

      expect(api.getSession()?.id).toEqual(initialSession.id);
      expect(api.getSession()?.overrides).toBeDefined();
      expect(api.getSession()?.overrides).toStrictEqual({ geoLocationTrackingEnabled: false });

      const overrides = { serviceName: 'service-1' };
      const newSession = { id: 'my-new-session' };
      api.setSession(newSession, { overrides });
      expect(api.getSession()?.id).toEqual(newSession.id);
      expect(api.getSession()?.overrides).toStrictEqual({ ...overrides, geoLocationTrackingEnabled: false });

      const newOverrides = { serviceName: 'service-2' };
      api.setSession(newSession, { overrides: newOverrides });
      expect(api.getSession()?.id).toEqual(newSession.id);
      expect(api.getSession()?.overrides).toStrictEqual({ ...newOverrides, geoLocationTrackingEnabled: false });
    });
  });

  describe('setPage / getPage', () => {
    it('updates the page meta when setPage(meta) is called', () => {
      const { api } = initializeFaro(mockConfig());

      const page = { url: 'http://example.com/my-page', id: 'my-page' };
      api.setPage(page);
      expect(api.getPage()).toEqual(page);

      const newPage = { url: 'http://example.com/my-new-page', id: 'my-new-page' };
      api.setPage(newPage);
      expect(api.getPage()).toEqual(newPage);
    });

    it('updates the page id if the parameter of setPage is a string', () => {
      const { api } = initializeFaro(mockConfig());

      const initialPage = { url: 'http://example.com/my-page', id: 'my-page', attributes: { hello: 'world' } };
      api.setPage(initialPage);
      expect(api.getPage()).toStrictEqual(initialPage);

      const newPageId = 'my-new-page-id';
      api.setPage(newPageId);
      expect(api.getPage()?.id).toEqual(newPageId);
    });

    it('gets the page meta when getPage(meta) is called', () => {
      const { api } = initializeFaro(mockConfig());

      const page = { url: 'http://example.com/my-page', id: 'my-page' };
      api.setPage(page);
      expect(api.getPage()).toEqual(page);
    });

    // Note: there's an integration test in the web-sdk that tests the following scenario:
    // >>> it'sets the page meta correctly when setPage() is called and the locally cached meta is not set <<<
    // This is because it needs web-sdk functions to be able to test the integration
    // you can find it in the pageMeta test file: https://github.com/grafana/faro-web-sdk/blob/3c2ba0f8ea8bfdfb39cd79b704d9a6c07bc7834e/packages/web-sdk/src/metas/page/meta.test.ts#L10
  });
});
