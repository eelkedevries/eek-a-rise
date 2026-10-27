import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: '/eek-a-rise/',
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  build: {
    sourcemap: false,
  },
  worker: {
    format: 'es',
  },
});
