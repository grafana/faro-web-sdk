import { initializeFaroForExtension, faro } from '@grafana/faro-chrome-extension';
import { ConsoleTransport } from '@grafana/faro-web-sdk';

initializeFaroForExtension({
  app: { name: 'faro-chrome-extension-demo', version: '1.0.0' },
  extensionContext: 'background',
  transports: [new ConsoleTransport()],
  // To send to a real collector, replace transports with:
  // url: 'http://localhost:12345/collect',
});

chrome.runtime.onInstalled.addListener((details) => {
  faro.api.pushEvent('extension-installed', { reason: details.reason });
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  faro.api.pushLog([`Message received: ${JSON.stringify(message)}`]);
});
