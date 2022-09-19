import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { getEnvConfig } from './src/common';

export default defineConfig(({ mode }) => {
  return {
    plugins: [tsconfigPaths(), react()],
    server: {
      watch: {
        awaitWriteFinish: true,
      },
    },
    build: {
      minify: false,
    },
    define: {
      'process.env.__APP_ENV__': JSON.stringify(
        getEnvConfig(loadEnv(mode, '../', ['AGENT_', 'CORTEX_', 'DEMO_', 'GRAFANA_', 'LOKI_', 'TEMPO_']), mode)
      ),
    },
  };
});
