import * as faroModule from '@grafana/faro-core';
import { initializeFaro } from '@grafana/faro-core';
import { mockConfig } from '@grafana/faro-core/src/testUtils';

import { createPageMeta } from './meta';

describe('createPageMeta', () => {
  it('does not add pageId by default', () => {
    initializeFaro(mockConfig());

    const initialUrl = 'http://localhost/initial-page/';
    global.window.history.pushState({}, '', new URL(initialUrl));
    expect(global.window.location.href).toBe(initialUrl);

    // @ts-expect-error
    const meta = createPageMeta()();
    const pageMeta = meta.page;

    expect(pageMeta.url).toBe(initialUrl);
    expect(pageMeta.id).toBeUndefined();
  });

  it('parse pageId with provided parser function ', () => {
    initializeFaro(mockConfig());

    const initialPagePostfix = 'initial-page-postfix';
    jest.spyOn(faroModule, 'genShortID').mockReturnValueOnce(initialPagePostfix);

    const initialUrl = 'http://localhost/initial-page/';
    global.window.history.pushState({}, '', new URL(initialUrl));
    expect(global.window.location.href).toBe(initialUrl);

    // @ts-expect-error
    const meta = createPageMeta({ generatePageId: (location) => location.href + '_' + faroModule.genShortID() })();
    const pageMeta = meta.page;

    expect(pageMeta.url).toBe(initialUrl);
    expect(pageMeta.id).toBe(initialUrl + '_' + initialPagePostfix);

    // TODO: It seems that jest doesn't really change the location. At least it's not triggered in the code.
    // Logic works well when manually tested in the browser. See attached video in the PR.

    // const newPagePostfix = 'new-page-postfix';
    // jest.spyOn(faroModule, 'genShortID').mockReturnValueOnce(newPagePostfix);

    // const newUrl = 'http://localhost/new-page/';
    // global.window.history.pushState({}, '', new URL(newUrl));

    // expect(pageMeta.url).toBe(newUrl);
    // expect(meta.page.id).toBe(newUrl + '_' + newPagePostfix);
  });

  it('initializes the page meta with the attributes provided by the initial page meta', () => {
    initializeFaro(mockConfig());

    const initialUrl = 'http://localhost/initial-page/';
    global.window.history.pushState({}, '', new URL(initialUrl));
    expect(global.window.location.href).toBe(initialUrl);

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

    expect(pageMeta.url).toBe(initialUrl);
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

    expect(pageMeta.url).toBe('http://localhost/initial-page/');
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
});
