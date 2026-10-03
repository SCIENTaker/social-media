import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base は GitHub Pages 等のサブパス配信に合わせて変更できる(例: BASE_PATH=/social-media/)
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1000 },
});
