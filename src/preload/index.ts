import { contextBridge, ipcRenderer } from 'electron'
import type { Settings } from '../types/settings'

// macOS IMK watchdog가 mach port 실패 시 renderer process에 SIGTERM을 보냄
// 핸들러를 등록해 프로세스가 죽지 않도록 막고, main에 IMK 리셋 요청
process.on('SIGTERM', () => {
  ipcRenderer.send('renderer:imk-watchdog')
})

const api = {
  file: {
    open: (filePath?: string) => ipcRenderer.invoke('file:open', filePath),
    save: (filePath: string, content: string, encoding: string) =>
      ipcRenderer.invoke('file:save', filePath, content, encoding),
    saveAs: (content: string, encoding: string, defaultPath?: string) =>
      ipcRenderer.invoke('file:saveAs', content, encoding, defaultPath)
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
    }
  },
  dialog: {
    confirmClose: (fileName: string): Promise<number> =>
      ipcRenderer.invoke('dialog:confirmClose', fileName)
  },
  menu: {
    on: (channel: string, cb: (...args: unknown[]) => void) => {
      const handler = (_: Electron.IpcRendererEvent, ...args: unknown[]): void => cb(...args)
      ipcRenderer.on(channel, handler)
      return () => ipcRenderer.removeListener(channel, handler)
    },
    popup: (menuId: string, x: number, y: number) => ipcRenderer.send('menu:popup', menuId, x, y),
    trigger: (channel: string, ...args: unknown[]) => ipcRenderer.send('menu:trigger', channel, ...args),
    role: (role: string) => ipcRenderer.send('menu:role', role)
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
