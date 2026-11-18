import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  // /socket.io needs ws:true so the dev server also proxies the WebSocket upgrade for real-time chat.
  const proxy = { '/api': { target, changeOrigin: true }, '/socket.io': { target, changeOrigin: true, ws: true } };

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { proxy },
  };
});
