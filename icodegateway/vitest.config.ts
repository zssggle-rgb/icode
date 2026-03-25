import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['server/services/__tests__/**/*.test.ts', 'server/integration/**/*.test.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 60000, // 60s for upstream LLM API calls
    hookTimeout: 30000
  }
})
