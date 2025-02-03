import { initializeFaro } from '@grafana/faro-core';
import * as faroModule from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';
import { makeCoreConfig } from '@grafana/faro-web-sdk';

import { createPageMeta } from './meta';

const originalWindow = window;

describe('createPageMeta', () => {
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

  it('does not add pageId by default', () => {
    // @ts-expect-error
    const meta = createPageMeta()();
    const pageMeta = meta.page;

    expect(pageMeta.url).toBe(mockUrl);
    expect(pageMeta.id).toBeUndefined();
  });

  it('initializes the page meta with the attributes provided by the initial page meta', () => {
    // @ts-expect-error
    let meta = createPageMeta({
      initialPageMeta: {
        url: 'initial-page-url',
      },
    })();

    let pageMeta = meta.page;

    expect(pageMeta.url).toBe('initial-page-url');
    expect(pageMeta.id).toBeUndefined();
    expect(pageMeta.attributes).toBeUndefined();

    // @ts-expect-error
    meta = createPageMeta({
      initialPageMeta: {
        id: 'initial-page-id',
      },
    })();

    pageMeta = meta.page;

    expect(pageMeta.url).toBe(mockUrl);
    expect(pageMeta.id).toBe('initial-page-id');
    expect(pageMeta.attributes).toBeUndefined();

    // @ts-expect-error
    meta = createPageMeta({
      initialPageMeta: {
        attributes: {
          foo: 'bar',
        },
      },
    })();

    pageMeta = meta.page;

    expect(pageMeta.url).toBe(mockUrl);
    expect(pageMeta.id).toBeUndefined();
    expect(pageMeta.attributes).toStrictEqual({ foo: 'bar' });

    // @ts-expect-error
    meta = createPageMeta({
      initialPageMeta: {
        url: 'initial-page-url',
        id: 'initial-page-id',
        attributes: {
          foo: 'bar',
        },
      },
    })();

    pageMeta = meta.page;

    expect(pageMeta.url).toBe('initial-page-url');
    expect(pageMeta.id).toBe('initial-page-id');
    expect(pageMeta.attributes).toStrictEqual({ foo: 'bar' });
  });

  it('parse pageId with provided parser function ', () => {
    const initialPagePostfix = 'initial-page-postfix';
    jest.spyOn(faroModule, 'genShortID').mockReturnValueOnce(initialPagePostfix);

    // @ts-expect-error
    const meta = createPageMeta({ generatePageId: (location) => location.href + '_' + faroModule.genShortID() })();
    const pageMeta = meta.page;

    expect(pageMeta?.url).toBe(mockUrl);
    expect(pageMeta?.id).toBe(mockUrl + '_' + initialPagePostfix);
  });

  it('sets the page meta correctly when setPage() is called and the locally cached meta is not set', () => {
    const _mockConfig = mockConfig();
    // @ts-expect-error
    delete _mockConfig.metas;

    const { api } = initializeFaro(makeCoreConfig(_mockConfig));

    const newPageId = 'my-new-page-id';
    api.setPage(newPageId);
    expect(api.getPage()).toStrictEqual({
      url: mockUrl,
      id: newPageId,
    });
  });
});
