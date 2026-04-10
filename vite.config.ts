/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sudoku/solver-engine': path.resolve(__dirname, 'packages/solver-engine/src'),
    },
  },
  test: {
    include: ['packages/**/*.test.ts'],
  },
})
