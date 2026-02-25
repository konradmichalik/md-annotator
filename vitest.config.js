import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['server/**/*.js', 'client/src/**/*.{js,jsx}'],
      exclude: ['node_modules/', 'client/dist/']
    }
  }
})
