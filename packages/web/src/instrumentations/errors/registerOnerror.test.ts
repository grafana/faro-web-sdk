import { mockConfig, MockTransport } from '@grafana/agent-core/src/utils/tests';

import { initializeAgent } from '../../initialize';
import { registerOnerror } from './registerOnerror';

describe('registerOnerror', () => {
  it('will preserve the old callback', () => {
    let called = false;
    window.onerror = () => {
      called = true;
    };
    const transport = new MockTransport();
    const config = mockConfig({
      transports: [transport],
    });
    const agent = initializeAgent(config);
    registerOnerror(agent);

    window.onerror('boo', 'some file', 10, 10, new Error('boo'));
    expect(called).toBe(true);
    expect(transport.items).toHaveLength(1);
  });
});

export {};
