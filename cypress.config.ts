import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:1234',
    video: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
