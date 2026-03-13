import { ipcMain, dialog, BrowserWindow } from 'electron'
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
}
