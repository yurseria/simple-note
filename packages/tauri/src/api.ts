import { invoke } from '@tauri-apps/api/core'
import { open, save, ask, message } from '@tauri-apps/plugin-dialog'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
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

    read: async (filePath: string) => {
      return await invoke<ReadResult>('read_file_with_encoding', { filePath })
    },

    save: async (filePath: string, content: string, encoding: string) => {
      await invoke('write_file_with_encoding', { filePath, content, encoding })
      return true
    },

    saveClipboardImage: async (dirPath: string) => {
      return await invoke<string | null>('save_clipboard_image', { dirPath })
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
      return await invoke<number>('confirm_close_dialog', { fileName })
    },
  },

  menu: {
    dispatch: (action: string, ...args: unknown[]) => {
      window.dispatchEvent(new CustomEvent(action, { detail: args }))
    },
    executeRole: (role: string) => {
      if (role === 'togglefullscreen') {
        invoke('toggle_fullscreen')
      } else if (role === 'quit') {
        getCurrentWindow().close()
      } else if (role === 'toggleDevTools') {
        invoke('toggle_devtools')
      } else if (role === 'about') {
        message('Simple Note - A beautiful and simple plain text editor.', { title: 'About Note', kind: 'info' })
      } else if (['selectAll', 'undo', 'redo'].includes(role)) {
        window.dispatchEvent(new CustomEvent(`editor:${role}`))
      } else if (['cut', 'copy', 'paste'].includes(role)) {
        document.execCommand(role)
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

  window: {
    minimize: () => getCurrentWindow().minimize(),
    toggleMaximize: () => getCurrentWindow().toggleMaximize(),
    close: () => getCurrentWindow().close(),
  },

  platform: 'darwin',
  runtime: 'tauri',
}

const REPO = 'yurseria/simple-note'

/**
 * macOS: 코드 서명이 없어서 plugin-updater 사용 불가.
 * GitHub API로 최신 버전을 확인하고 install.sh 또는 릴리스 페이지를 안내한다.
 */
async function checkViaGitHubApi(): Promise<void> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json() as { tag_name: string }
  const latest = data.tag_name.replace(/^v/, '')
  const current = await invoke<string>('get_app_version')

  if (latest === current) {
    await message('현재 최신 버전입니다.', { title: '업데이트 확인', kind: 'info' })
    return
  }

  const cmd = `curl -fsSL https://raw.githubusercontent.com/${REPO}/main/scripts/install.sh | bash`

  const copy = await ask(
    `새 버전 ${latest}이 있습니다.\n터미널에서 아래 명령으로 업데이트할 수 있습니다:\n\n${cmd}`,
    { title: '업데이트 확인', kind: 'info', okLabel: '복사 및 닫기', cancelLabel: '릴리스 페이지 열기' }
  )
  if (copy) {
    await invoke('copy_to_clipboard', { text: cmd })
  } else {
    await invoke('open_external_url', { url: `https://github.com/${REPO}/releases/latest` })
  }
}

/**
 * Windows: plugin-updater로 자동 다운로드 + 설치
 */
async function checkViaPluginUpdater(): Promise<void> {
  const update = await check()
  if (update) {
    const yes = await ask(
      `새 버전 ${update.version}이 있습니다. 지금 업데이트하시겠습니까?`,
      { title: '업데이트 확인', kind: 'info', okLabel: '업데이트', cancelLabel: '나중에' }
    )
    if (yes) {
      await update.downloadAndInstall()
      await relaunch()
    }
  } else {
    await message('현재 최신 버전입니다.', { title: '업데이트 확인', kind: 'info' })
  }
}

async function checkForUpdates(): Promise<void> {
  try {
    const platform = await invoke<string>('get_platform')
    if (platform === 'darwin') {
      await checkViaGitHubApi()
    } else {
      await checkViaPluginUpdater()
    }
  } catch (e) {
    await message(`업데이트 확인 중 오류가 발생했습니다: ${e}`, { title: '업데이트 오류', kind: 'error' })
  }
}

export async function initTauriPlatform(): Promise<void> {
  const platform = await invoke<string>('get_platform')
  ;(tauriApi as { platform: string }).platform = platform

  // macOS: 네이티브 메뉴 이벤트로 업데이트 확인
  // Windows/Linux: 커스텀 TitleBar의 dispatch로 업데이트 확인
  if (platform === 'darwin') {
    listen<{ action: string }>('menu-event', (event) => {
      if (event.payload.action === 'menu:checkForUpdates') {
        checkForUpdates()
      }
    })
  } else {
    window.addEventListener('checkForUpdates', () => checkForUpdates())
  }

  // Tauri drag-drop 이벤트 → renderer로 전달
  const { getCurrentWebviewWindow } = await import('@tauri-apps/api/webviewWindow')
  const webview = getCurrentWebviewWindow()
  webview.onDragDropEvent((event) => {
    if (event.payload.type === 'drop') {
      for (const path of event.payload.paths) {
        window.dispatchEvent(new CustomEvent('tauri:file-drop', { detail: path }))
      }
    }
  })
}
