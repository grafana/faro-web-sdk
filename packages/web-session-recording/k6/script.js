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

const faroWebSessionRecordingMinified = open('../dist/bundle/faro-web-session-recording.iife.js');

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
          app: {
            name: 'QuickPizza',
            version: '1.0.0',
            environment: 'production'
          },
          transports: [
            new window.GrafanaFaroWebSdk.ConsoleTransport({
              level: window.GrafanaFaroWebSdk.LogLevel.INFO,
            }),
          ],
          instrumentations: [
            new window.GrafanaFaroWebSessionRecording.SessionRecordingInstrumentation()
          ]
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

  await page.goto('http://localhost:3333');
  sleep(2);

  await page.locator('.align-items-center > [data-dropdown="products"]').click();
  sleep(2);

  await page.locator('div:nth-of-type(4) a:nth-of-type(1) > div .copy').click();
  sleep(2);

  await page.locator('div:nth-of-type(5) .flex-direction-column > div').click();
  sleep(2);

  await page
    .locator(
      'html > body:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(1) > div:nth-of-type(5) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > ul:nth-of-type(1) > li:nth-of-type(1) > a:nth-of-type(1)'
    )
    .click();
  sleep(2);

  await page.locator('section:nth-of-type(1) .expand-table-btn').click();
  sleep(2);

  await page.locator('.table-modal').click();

  sleep(60);
}
