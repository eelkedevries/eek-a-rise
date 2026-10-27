import { defineConfig } from 'vite';

export default defineConfig({
  base: '/eek-a-rise/',
  build: {
    sourcemap: false,
  },
  worker: {
    format: 'es',
  },
});
