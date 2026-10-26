import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/QualityAtlas/',
  server: { proxy: { '/api': 'http://localhost:8787' } },
  test: { environment: 'node', globals: true }
});
