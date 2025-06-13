import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        kesehatan: resolve(__dirname, 'kesehatan.html'),
        lihatdata: resolve(__dirname, 'lihatdata.html'),
      },
    },
  },
});
