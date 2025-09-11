import { sleep } from 'k6';
import { browser } from 'k6/browser';

export const options = {
  scenarios: {
    browser: {
      executor: 'shared-iterations',
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    checks: ['rate==1.0'],
  },
};

const faroWebSessionRecordingMinified = open('../dist/bundle/faro-instrumentation-session-recording.iife.js');

export default async function () {
  const context = await browser.newContext();
  await context.addInitScript(`
      (function () {
        
        function attachFaro() {
          // Create a script tag for loading the library
          var script = document.createElement('script');

          // Set the source of the script tag to the CDN
          script.src = 'https://unpkg.com/@grafana/faro-web-sdk@^1.0.0-beta/dist/bundle/faro-web-sdk.iife.js';

          // Dispatch event when Faro SDK is loaded
          script.onload = function() {
            window.dispatchEvent(new Event('faroSdkLoaded'));
          };

          // Append the script tag to the head of the HTML document
          document.head.appendChild(script);
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', attachFaro);
        } else {
            attachFaro();
        }
      })();
   `);
  await context.addInitScript(faroWebSessionRecordingMinified);
  await context.addInitScript(`
    (function() {
      function initializeFaro() {
        console.log("Faro SDK loaded, initializing...");
        
        window.GrafanaFaroWebSdk.initializeFaro({
         isolate: true,
          app: {
            name: 'QuickPizza',
            version: '1.0.0',
            environment: 'production'
          },
          batching: {
            enabled: true
          },
          transports: [
            // new window.GrafanaFaroWebSdk.ConsoleTransport({
            //   level: window.GrafanaFaroWebSdk.LogLevel.INFO,
            // }),
            new window.GrafanaFaroWebSdk.FetchTransport({
              url: "http://localhost:8080/events" 
            }),
          ],
          instrumentations: [
            new window.GrafanaFaroWebSdk.SessionInstrumentation(),
            new window.GrafanaFaroInstrumentationSessionRecording.SessionRecordingInstrumentation(
              {
                inlineImages: true,
                inlineStylesheet: true,
                collectFonts: true,
                recordCanvas: true,
                recordCrossOriginIframes: true
              }
            )
          ],
          internalLoggerLevel: window.GrafanaFaroWebSdk.InternalLoggerLevel.VERBOSE,
        });

        console.log("Faro SDK initialized");
      }

      // Listen for the Faro SDK loaded event
      window.addEventListener('faroSdkLoaded', initializeFaro);
      
      // Fallback in case the event was already fired
      if (window.GrafanaFaroWebSdk) {
        initializeFaro();
      }
    })();
    `);
  const page = await context.newPage();

  // https://leetcode.com
  // https://grafana.com
  // https://amazon.com
  // https://allegro.pl
  // https://olx.pl
  await page.goto('https://grafana.com');
  sleep(5 * 60);

  await page.close();
}
