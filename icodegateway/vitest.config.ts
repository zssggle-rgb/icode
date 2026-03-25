import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['server/services/__tests__/**/*.test.ts'],
    environment: 'node',
    globals: true
  }
})
