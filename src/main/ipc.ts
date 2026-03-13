import { ipcMain, dialog, BrowserWindow, nativeTheme } from 'electron'
import { readFileWithEncoding, writeFileWithEncoding } from './fileManager'
import { store } from './store'
import { logger } from './logger'
import type { Settings } from '../types/settings'

const TEXT_FILTERS = [
  { name: 'Text Files', extensions: ['txt', 'md', 'markdown', 'log', 'csv'] },
  { name: 'All Files', extensions: ['*'] }
]

export function registerIpcHandlers(): void {

  ipcMain.handle('file:open', async (_, filePath?: string) => {
    let targetPath = filePath
    if (!targetPath) {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showOpenDialog(win!, {
        properties: ['openFile'],
        filters: TEXT_FILTERS
      })
      if (result.canceled || result.filePaths.length === 0) return null
      targetPath = result.filePaths[0]
    }
    try {
      const data = await readFileWithEncoding(targetPath)
      logger.info('file:open', { path: targetPath, encoding: data.encoding, language: data.language })
      return { filePath: targetPath, ...data }
    } catch (err) {
      logger.error('file:open failed', { path: targetPath, error: String(err) })
      throw err
    }
  })

  ipcMain.handle('file:save', async (_, filePath: string, content: string, encoding: string) => {
    try {
      await writeFileWithEncoding(filePath, content, encoding)
      logger.info('file:save', { path: filePath, encoding, bytes: Buffer.byteLength(content) })
      return true
    } catch (err) {
      logger.error('file:save failed', { path: filePath, error: String(err) })
      throw err
    }
  })

  ipcMain.handle(
    'file:saveAs',
    async (_, content: string, encoding: string, defaultPath?: string) => {
      const win = BrowserWindow.getFocusedWindow()
      const result = await dialog.showSaveDialog(win!, {
        defaultPath: defaultPath ?? 'Untitled.txt',
        filters: TEXT_FILTERS
      })
      if (result.canceled || !result.filePath) return null
      try {
        await writeFileWithEncoding(result.filePath, content, encoding)
        logger.info('file:saveAs', { path: result.filePath, encoding, bytes: Buffer.byteLength(content) })
        return result.filePath
      } catch (err) {
        logger.error('file:saveAs failed', { path: result.filePath, error: String(err) })
        throw err
      }
    }
  )

  ipcMain.handle('settings:get', () => store.store)

  ipcMain.handle('settings:set', <K extends keyof Settings>(
    _: Electron.IpcMainInvokeEvent,
    key: K,
    value: Settings[K]
  ) => {
    store.set(key, value)
    logger.info('settings:set', { key })
    
    if (key === 'editor') {
      const editorSettings = value as Settings['editor']
      const isDark = editorSettings.theme === 'dark'
      nativeTheme.themeSource = isDark ? 'dark' : 'light'
      
      const bgColor = isDark ? '#282c34' : '#fafafa'
      const symbolColor = isDark ? '#abb2bf' : '#282c34'
      
      BrowserWindow.getAllWindows().forEach((win) => {
        if (process.platform === 'win32') {
          win.setTitleBarOverlay({ color: bgColor, symbolColor })
        }
        win.setBackgroundColor(bgColor)
      })
    }

    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('settings:changed', key, value)
    })
  })

  ipcMain.handle('dialog:confirmClose', async (_, fileName: string) => {
    const win = BrowserWindow.getFocusedWindow()
    const result = await dialog.showMessageBox(win!, {
      type: 'warning',
      message: `"${fileName}"의 변경사항을 저장하겠습니까?`,
      buttons: ['저장', '저장 안 함', '취소'],
      defaultId: 0,
      cancelId: 2
    })
    return result.response // 0: save, 1: don't save, 2: cancel
  })

  ipcMain.on('menu:trigger', (e, channel: string, ...args: unknown[]) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      win.webContents.send(channel, ...args)
    }
  })

  ipcMain.on('menu:role', (e, role: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    if (role === 'togglefullscreen') {
      win.setFullScreen(!win.isFullScreen())
    } else if (role === 'toggleDevTools') {
      win.webContents.toggleDevTools()
    } else if (role === 'quit') {
      import('electron').then(({ app }) => app.quit())
    } else if (role === 'about') {
      import('electron').then(({ app, dialog }) => {
        dialog.showMessageBox(win, {
          type: 'info',
          title: '정보',
          message: app.name,
          detail: `버전: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}\nV8: ${process.versions.v8}\nOS: ${process.type} ${process.arch}`,
          buttons: ['확인']
        })
      })
    } else {
      // Execute common roles like undo, redo, cut, copy, paste, selectAll
      if (typeof win.webContents[role] === 'function') {
        win.webContents[role]()
      }
    }
  })
}
