import { invoke } from '@tauri-apps/api/core'
import { open, save, ask } from '@tauri-apps/plugin-dialog'
import { listen } from '@tauri-apps/api/event'
import type { NoteAPI, ReadResult } from '@simple-note/renderer/types/api'
import type { Settings } from '@simple-note/renderer/types/settings'

const TEXT_EXTENSIONS = [
  'txt', 'md', 'markdown', 'log', 'csv', 'json', 'jsonc',
  'yaml', 'yml', 'toml', 'xml', 'ini', 'cfg', 'conf', 'env',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'py', 'rb', 'rs', 'go', 'java', 'kt', 'c', 'cpp', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'ps1',
  'sql', 'graphql', 'gql',
  'swift', 'dart', 'lua', 'r', 'php',
  'dockerfile', 'makefile', 'gitignore', 'editorconfig',
]

export const tauriApi: NoteAPI = {
  file: {
    open: async (filePath?: string) => {
      let targetPath = filePath
      if (!targetPath) {
        const selected = await open({
          multiple: false,
          filters: [
            { name: 'Text Files', extensions: TEXT_EXTENSIONS },
            { name: 'All Files', extensions: ['*'] },
          ],
        })
        if (!selected) return null
        targetPath = selected as string
      }
      const data = await invoke<ReadResult>('read_file_with_encoding', { filePath: targetPath })
      return { filePath: targetPath, ...data }
    },

    save: async (filePath: string, content: string, encoding: string) => {
      await invoke('write_file_with_encoding', { filePath, content, encoding })
      return true
    },

    saveAs: async (content: string, encoding: string, defaultPath?: string) => {
      const selected = await save({
        defaultPath: defaultPath ?? 'Untitled.txt',
        filters: [
          { name: 'Text Files', extensions: TEXT_EXTENSIONS },
          { name: 'All Files', extensions: ['*'] },
        ],
      })
      if (!selected) return null
      await invoke('write_file_with_encoding', { filePath: selected, content, encoding })
      return selected
    },
  },

  settings: {
    get: async (): Promise<Settings> => {
      return await invoke<Settings>('get_settings')
    },
    set: async <K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> => {
      await invoke('set_setting', { key, value })
    },
  },

  dialog: {
    confirmClose: async (fileName: string) => {
      const shouldSave = await ask(
        `Do you want to save changes to "${fileName}"?`,
        { title: 'Unsaved Changes', kind: 'warning', okLabel: 'Save', cancelLabel: "Don't Save" }
      )
      return shouldSave ? 0 : 1
    },
  },

  menu: {
    dispatch: (action: string, ...args: unknown[]) => {
      window.dispatchEvent(new CustomEvent(action, { detail: args }))
    },
    executeRole: (role: string) => {
      if (role === 'togglefullscreen') {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          const win = getCurrentWindow()
          win.isFullscreen().then((fs) => win.setFullscreen(!fs))
        })
      } else if (role === 'quit') {
        import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
          getCurrentWindow().close()
        })
      }
    },
    subscribe: (handler: (action: string, payload?: string) => void) => {
      const unlisten = listen<{ action: string; payload?: string }>('menu-event', (event) => {
        handler(event.payload.action, event.payload.payload)
      })
      return () => { unlisten.then((fn) => fn()) }
    },
    onLanguageChange: (lang: string) => invoke('rebuild_menu', { lang }),
  },

  platform: 'darwin',
  runtime: 'tauri',
}

export async function initTauriPlatform(): Promise<void> {
  const platform = await invoke<string>('get_platform')
  ;(tauriApi as { platform: string }).platform = platform
}
