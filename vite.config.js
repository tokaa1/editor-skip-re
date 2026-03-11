import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: {
    open: false,
    port: 4001
  },
  base: "/editor/"
});
