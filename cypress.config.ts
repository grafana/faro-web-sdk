import webpackPreprocessor from '@cypress/webpack-preprocessor';
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    video: false,
    requestTimeout: 3000,
    setupNodeEvents(on) {
      on(
        'file:preprocessor',
        webpackPreprocessor({
          webpackOptions: {
            resolve: { extensions: ['.ts', '.js'] },
            module: {
              rules: [
                {
                  test: /\.ts$/,
                  exclude: /node_modules/,
                  use: [{ loader: 'ts-loader', options: { transpileOnly: true, configFile: 'cypress/tsconfig.json' } }],
                },
              ],
            },
          },
        })
      );
    },
  },
});
