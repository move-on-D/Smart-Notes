import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true // Exposes on local network so mobile phone on same Wi-Fi can open it too!
  }
});
