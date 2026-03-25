import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/__tests__/**/*.test.tsx'],
    environment: 'happy-dom',
    globals: true,
  },
});
