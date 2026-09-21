import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: resolve(import.meta.dirname, 'index.html'),
        builder: resolve(import.meta.dirname, '3d-lab.html'),
      },
    },
  },
});
