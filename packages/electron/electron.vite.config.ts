import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@simple-note/renderer/platform': resolve('../renderer/src/platform.ts'),
        '@simple-note/renderer/types/api': resolve('../renderer/src/types/api.ts'),
        '@simple-note/renderer/types/settings': resolve('../renderer/src/types/settings.ts'),
        '@simple-note/renderer/types/tab': resolve('../renderer/src/types/tab.ts'),
        '@simple-note/renderer': resolve('../renderer/src/index.ts')
      }
    },
    plugins: [react()]
  }
})
