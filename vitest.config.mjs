import { defineConfig } from 'vitest/config';

export default defineConfig({
  pool: 'threads',
  resolve: {
    preserveSymlinks: true
  },
  test: {
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    include: ['tests/unit/**/*.test.{ts,tsx}']
  }
});
