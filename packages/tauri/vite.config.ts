import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@simple-note/renderer/platform': resolve(__dirname, '../renderer/src/platform.ts'),
      '@simple-note/renderer/types/api': resolve(__dirname, '../renderer/src/types/api.ts'),
      '@simple-note/renderer/types/settings': resolve(__dirname, '../renderer/src/types/settings.ts'),
      '@simple-note/renderer/types/tab': resolve(__dirname, '../renderer/src/types/tab.ts'),
      '@simple-note/renderer/domain/driveFolder': resolve(__dirname, '../renderer/src/domain/driveFolder.ts'),
      '@simple-note/renderer/domain/migration': resolve(__dirname, '../renderer/src/domain/migration.ts'),
      '@simple-note/renderer/domain/filename': resolve(__dirname, '../renderer/src/domain/filename.ts'),
      '@simple-note/renderer': resolve(__dirname, '../renderer/src/index.ts'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
