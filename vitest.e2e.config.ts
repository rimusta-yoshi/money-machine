import { defineConfig } from 'vitest/config'

/** Browser end-to-end tests (npm run e2e): real Chrome against both workers under Miniflare. */
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.test.ts'],
    testTimeout: 180_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
})
