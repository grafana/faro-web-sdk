import * as faroModule from '@grafana/faro-core';

import { createPageMeta } from './meta';

describe('createPageMeta', () => {
  it('parse pageId with provided parser function ', () => {
    const initialPagePostfix = 'initial-page-postfix';
    jest.spyOn(faroModule, 'genShortID').mockReturnValueOnce(initialPagePostfix);

    const initialUrl = 'http://localhost/initial-page/';
    window.history.pushState({}, '', new URL(initialUrl));
    expect(window.location.href).toBe(initialUrl);

    // @ts-expect-error
    const meta = createPageMeta((location) => location.href + '_' + faroModule.genShortID())();
    const pageMeta = meta.page;

    expect(pageMeta.url).toBe(initialUrl);
    expect(pageMeta.id).toBe(initialUrl + '_' + initialPagePostfix);

    // const newPagePostfix = 'new-page-postfix';
    // jest.spyOn(faroModule, 'genShortID').mockReturnValueOnce(newPagePostfix);

    // const newUrl = 'http://localhost/new-page/';
    // window.history.pushState({}, '', new URL(newUrl));

    // // expect(pageMeta.url).toBe(newUrl);
    // expect(meta.page.id).toBe(newUrl + '_' + newPagePostfix);
  });
});
