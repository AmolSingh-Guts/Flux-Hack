import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  const apiProxyTarget =
    environment.API_PROXY_TARGET?.trim() || 'http://127.0.0.1:4000';
  const proxy = {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: {
      host: '127.0.0.1',
      port: 4173,
      strictPort: true,
      proxy,
    },
    resolve: {
      extensions: ['.js', '.jsx'],
      alias: {
        '@': '/src',
        'components': '/src/components',
      },
    },
  };
});
