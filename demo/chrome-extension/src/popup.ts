import { initializeFaroForExtension, faro } from '@grafana/faro-chrome-extension';
import { ConsoleTransport } from '@grafana/faro-web-sdk';

initializeFaroForExtension({
  app: { name: 'faro-chrome-extension-demo', version: '1.0.0' },
  extensionContext: 'popup',
  transports: [new ConsoleTransport()],
  // To send to a real collector, replace transports with:
  // url: 'http://localhost:12345/collect',
});

const sessionEl = document.getElementById('session');
if (sessionEl) {
  const sessionId = faro.api.getSession()?.id ?? 'unknown';
  sessionEl.textContent = `Session: ${sessionId}`;
}

document.getElementById('btn-log')?.addEventListener('click', () => {
  faro.api.pushLog(['Hello from popup']);
});

document.getElementById('btn-error')?.addEventListener('click', () => {
  faro.api.pushError(new Error('Test error from popup'));
});

document.getElementById('btn-event')?.addEventListener('click', () => {
  faro.api.pushEvent('button-clicked', { source: 'popup' });
});
