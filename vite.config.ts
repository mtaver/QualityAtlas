import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? '/QualityAtlas/' : '/',
  server: { proxy: { '/api': 'http://localhost:8787' } },
  test: { environment: 'jsdom', globals: true }
});
