import { initializeFaroForExtension, faro, LogLevel } from '@grafana/faro-chrome-extension';
import { ConsoleTransport } from '@grafana/faro-web-sdk';

initializeFaroForExtension({
  app: { name: 'faro-chrome-extension-demo', version: '1.0.0' },
  extensionContext: 'content-script',
  transports: [new ConsoleTransport({ level: LogLevel.INFO })],
  // To send to a real collector, replace transports with:
  // url: 'http://localhost:12345/collect',
});

faro.api.pushLog([`Content script loaded on ${window.location.href}`]);

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  faro.api.pushEvent('page-click', {
    tag: target.tagName,
    id: target.id || '(none)',
  });
});
