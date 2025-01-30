import * as faroModule from '@grafana/faro-core';

import { createPageMeta } from './meta';

describe('createPageMeta', () => {
  it('does not add pageId by default', () => {
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
});
