import { contextBridge, ipcRenderer } from 'electron'
import type { NoteAPI } from '@simple-note/renderer/types/api'
import type { Settings } from '@simple-note/renderer/types/settings'

// macOS IMK watchdog가 mach port 실패 시 renderer process에 SIGTERM을 보냄
process.on('SIGTERM', () => {
  ipcRenderer.send('renderer:imk-watchdog')
})

const MENU_CHANNELS = [
  'menu:newTab', 'menu:open', 'menu:save', 'menu:saveAs',
  'menu:closeTab', 'menu:gotoLine', 'menu:toggleMarkdownPreview',
  'menu:find', 'menu:replace', 'menu:toggleLineNumbers',
  'menu:setLanguage', 'menu:setUILanguage',
  'menu:fontSizeUp', 'menu:fontSizeDown', 'menu:fontSizeReset',
  'menu:setTheme', 'menu:setInfoBarMode',
]

const electronApi: NoteAPI = {
  file: {
    open: (filePath?: string) => ipcRenderer.invoke('file:open', filePath),
    save: (filePath: string, content: string, encoding: string) =>
      ipcRenderer.invoke('file:save', filePath, content, encoding),
    saveAs: (content: string, encoding: string, defaultPath?: string) =>
      ipcRenderer.invoke('file:saveAs', content, encoding, defaultPath),
    saveClipboardImage: (dirPath: string) =>
      ipcRenderer.invoke('file:saveClipboardImage', dirPath),
  },
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
    set: <K extends keyof Settings>(key: K, value: Settings[K]) =>
      ipcRenderer.invoke('settings:set', key, value),
    onChange: (cb: (key: keyof Settings, value: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, key: keyof Settings, value: unknown): void =>
        cb(key, value)
      ipcRenderer.on('settings:changed', handler)
      return () => ipcRenderer.removeListener('settings:changed', handler)
    },
  },
  dialog: {
    confirmClose: (fileName: string): Promise<number> =>
      ipcRenderer.invoke('dialog:confirmClose', fileName),
  },
  menu: {
    dispatch: (action: string, ...args: unknown[]) =>
      ipcRenderer.send('menu:trigger', action, ...args),
    executeRole: (role: string) =>
      ipcRenderer.send('menu:role', role),
    subscribe: (handler: (action: string, payload?: string) => void) => {
      const listeners = MENU_CHANNELS.map((ch) => {
        const fn = (_: Electron.IpcRendererEvent, ...args: unknown[]) =>
          handler(ch, args[0] as string | undefined)
        ipcRenderer.on(ch, fn)
        return () => ipcRenderer.removeListener(ch, fn)
      })
      return () => listeners.forEach((off) => off())
    },
  },
  platform: process.platform,
  runtime: 'electron',
}

contextBridge.exposeInMainWorld('electronApi', electronApi)
