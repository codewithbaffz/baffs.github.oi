import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// FIX: Import fileURLToPath and URL from node:url to replace __dirname
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // FIX: Replaced path.resolve(__dirname, ...) with fileURLToPath(new URL(...))
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  css: {
    postcss: './postcss.config.cjs',
  },
  optimizeDeps: {
    include: ['react', 'react-dom'], 
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/],
    },
  },
});