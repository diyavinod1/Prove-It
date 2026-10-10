import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // host: true lets you open the dev server on your phone via your LAN IP
  server: { host: true, port: 5173 },
});
