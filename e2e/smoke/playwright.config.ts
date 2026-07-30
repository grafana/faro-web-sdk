import { defineConfig } from '@playwright/test';

const CI = Boolean(process.env['CI']);

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  globalTimeout: CI ? 120_000 : 0,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // In CI, start-server-and-test manages the Vite lifecycle to avoid
  // signal-propagation issues with Yarn PnP. Locally, Playwright's
  // built-in webServer is more convenient.
  ...(!CI && {
    webServer: {
      command: 'yarn start',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: true,
    },
  }),
});
