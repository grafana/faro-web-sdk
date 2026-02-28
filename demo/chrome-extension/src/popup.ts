import { initializeFaroForExtension, faro, LogLevel } from '@grafana/faro-chrome-extension';
import { ConsoleTransport } from '@grafana/faro-web-sdk';

initializeFaroForExtension({
  app: { name: 'faro-chrome-extension-demo', version: '1.0.0' },
  extensionContext: 'popup',
  transports: [new ConsoleTransport({ level: LogLevel.INFO })],
  // To send to a real collector, replace transports with:
  // url: 'http://localhost:12345/collect',
});

const sessionEl = document.getElementById('session');
if (sessionEl) {
  // Session is loaded asynchronously from chrome.storage.local,
  // so poll briefly until it becomes available.
  let attempts = 0;
  const interval = setInterval(() => {
    const sessionId = faro.api.getSession()?.id;
    if (sessionId || attempts >= 20) {
      sessionEl.textContent = `Session: ${sessionId ?? 'unknown'}`;
      clearInterval(interval);
    }
    attempts++;
  }, 100);
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

document.getElementById('btn-trace')?.addEventListener('click', () => {
  // This fetch is auto-instrumented by TracingInstrumentation and produces a trace span
  fetch('https://httpbin.org/get').catch(() => {
    /* ignore errors — the span is still recorded */
  });
});
