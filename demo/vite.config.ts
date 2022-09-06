import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  server: {
    watch: {
      awaitWriteFinish: true,
    },
  },
  build: {
    minify: false,
  },
});
