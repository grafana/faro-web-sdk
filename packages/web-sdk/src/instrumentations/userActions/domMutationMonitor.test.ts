import { JSDOM } from 'jsdom';

import { MESSAGE_TYPE_DOM_MUTATION } from './const';
import { monitorDomMutations } from './domMutationMonitor';

describe('DOM Mutation Monitor', () => {
  it('MutationObserver takeRecords method', () => {
    // Set up a basic DOM using JSDOM
    const dom = new JSDOM(`<!DOCTYPE html><p id="test">Hello</p>`);
    const document = dom.window.document;
    const targetNode = document.getElementById('test');

    const observable = monitorDomMutations();

    // Simulate a DOM change
    targetNode?.setAttribute('data-test', 'value');
    observable.subscribe((msg) => {
      expect(msg).toEqual({ type: MESSAGE_TYPE_DOM_MUTATION });
    });
  });
});
