import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Browser end-to-end tests run separately: npm run e2e
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
