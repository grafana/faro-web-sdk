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
    (async function() {
      // TODO: This is a hack, we should send an event after faro is attached and only then run this bit.
      // TODO: What happens if there's Faro instance already initialised or the web app will try to initialise
      //       it after we do it ourselves. Can we run two Faro instances? Should this be handled by the SDK or
      //       k6 that injects it?
      console.log("Waiting for Faro to load. ");
      await new Promise(r => setTimeout(r, 2000));
      console.log("Okay, faro should be here");

      window.GrafanaFaroWebSdk.initializeFaro({
            app: {
              name: 'QuickPizza',
              version: '1.0.0',
              environment: 'production'
            },
            transports: [
              new window.GrafanaFaroWebSdk.ConsoleTransport({
                    level: window.GrafanaFaroWebSdk.LogLevel.DEBUG,
                  }),
            ],
            instrumentations: [
              new window.GrafanaFaroWebSessionRecording.SessionRecordingInstrumentation()
            ]
          });
      })();
    `);
  const page = await context.newPage();

  await page.goto('http://localhost:3333');
  sleep(360);

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

  sleep(10);
}
