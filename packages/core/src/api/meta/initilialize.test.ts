import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';
import { makeCoreConfig } from '@grafana/faro-web-sdk';

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
      const { api } = initializeFaro(makeCoreConfig(mockConfig()));

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
      const { api } = initializeFaro(makeCoreConfig(mockConfig()));

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
  });

  describe('setPage / getPage', () => {
    it('updates the page meta when setPage(meta) is called', () => {
      const { api } = initializeFaro(makeCoreConfig(mockConfig()));

      const page = { url: 'http://example.com/my-page', id: 'my-page' };
      api.setPage(page);
      expect(api.getPage()).toEqual(page);

      const newPage = { url: 'http://example.com/my-new-page', id: 'my-new-page' };
      api.setPage(newPage);
      expect(api.getPage()).toEqual(newPage);
    });

    it('updates the page id if the parameter of setPage is a string', () => {
      const { api } = initializeFaro(makeCoreConfig(mockConfig()));

      const initialPage = { url: 'http://example.com/my-page', id: 'my-page', attributes: { hello: 'world' } };
      api.setPage(initialPage);
      expect(api.getPage()).toStrictEqual(initialPage);

      const newPageId = 'my-new-page-id';
      api.setPage(newPageId);
      expect(api.getPage()?.id).toEqual(newPageId);
    });

    it('sets the page meta correctly when setPage() is called for the first time', () => {
      console.log('makeCoreConfig(mockConfig()) :>> ', makeCoreConfig(mockConfig()));

      const _mockConfig = mockConfig();
      // @ts-expect-error
      delete _mockConfig.metas;

      const { api } = initializeFaro(makeCoreConfig(_mockConfig));

      const newPageId = 'my-new-page-id';
      api.setPage(newPageId);
      expect(api.getPage()).toStrictEqual({
        url: 'abc',
        id: mockUrl,
      });
    });

    it('gets the page meta when getPage(meta) is called', () => {
      const { api } = initializeFaro(makeCoreConfig(mockConfig()));

      const page = { url: 'http://example.com/my-page', id: 'my-page' };
      api.setPage(page);
      expect(api.getPage()).toEqual(page);
    });
  });
});
