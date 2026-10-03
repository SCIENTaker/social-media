import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base を相対パスにして、ドメイン直下でもサブディレクトリ(GitHub Pages 等)でも
// 設定なしで配信できるようにする(ルーティングはハッシュ方式なのでパスは常に index.html)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1000 },
});
