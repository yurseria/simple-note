import { app, BrowserWindow, shell, ipcMain, screen, nativeTheme } from 'electron'
app.name = 'Note'
import { join } from 'path'
import { registerIpcHandlers } from './ipc'
import { buildMenu } from './menu'
import { logger } from './logger'
import { store } from './store'

// ── Chromium 플래그 (app.whenReady() 이전에 설정) ──────────────────────────
// GPU sandbox만 해제 — GPU 프로세스는 유지해 macOS 폰트 렌더링(CJK 포함)이 정상 경로를 사용하게 함
// (in-process-gpu는 macOS에서 한글 서브픽셀 렌더링을 깨뜨림)
app.commandLine.appendSwitch('disable-gpu-sandbox')
// RendererCodeIntegrity는 Windows 전용 보안 기능 — macOS에서는 무해하게 비활성화
// IMEInputContextInBrowser는 절대 비활성화하지 않음:
//   비활성화하면 macOS IMK가 mach port로 직접 통신하려 하지만 실패하고
//   30초 후 watchdog이 프로세스 그룹 전체에 SIGTERM을 보냄 (exitCode:15 크래시 원인)
app.commandLine.appendSwitch('disable-features', 'RendererCodeIntegrity')
// 렌더러 행(hang) 감지 비활성화 — IME 처리 중 오탐 방지
app.commandLine.appendSwitch('disable-hang-monitor')
// dev 모드에서만 CDP 원격 디버깅 포트 활성화
if (process.env['ELECTRON_RENDERER_URL']) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
}

// ── 크래시 복구 상태 ──────────────────────────────────────────────────────
let crashRecoveryActive = false
const reloadTimestamps: number[] = []
const MAX_RELOADS_PER_MIN = 3

function canReload(): boolean {
  const now = Date.now()
  reloadTimestamps.push(now)
  const recent = reloadTimestamps.filter((t) => now - t < 60_000)
  reloadTimestamps.splice(0, reloadTimestamps.length, ...recent)
  return recent.length <= MAX_RELOADS_PER_MIN
}

// SIGTERM: macOS IMK watchdog가 프로세스 그룹 전체에 SIGTERM을 보낼 때
// Electron은 내부적으로 app.quit()를 호출하므로 before-quit에서 차단
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received — likely macOS IMK watchdog; suppressing exit')
})

export function createWindow(): BrowserWindow {
  const winWidth = 900
  const winHeight = 680
  const cursorPoint = screen.getCursorScreenPoint()
  const { workArea } = screen.getDisplayNearestPoint(cursorPoint)
  const x = Math.round(workArea.x + (workArea.width - winWidth) / 2)
  const y = Math.round(workArea.y + (workArea.height - winHeight) / 2)

  const isDark = store.get('editor.theme') === 'dark'
  nativeTheme.themeSource = isDark ? 'dark' : 'light'
  
  const bgColor = isDark ? '#282c34' : '#fafafa'
  const symbolColor = isDark ? '#abb2bf' : '#282c34'

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x,
    y,
    minWidth: 300,
    minHeight: 200,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'win32' && {
      titleBarOverlay: {
        color: bgColor,
        symbolColor: symbolColor,
        height: 36
      }
    }),
    ...(process.platform === 'darwin' && {
      trafficLightPosition: { x: 16, y: 16 }
    }),
    backgroundColor: bgColor,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 렌더러 콘솔 — warn/error만 파일에 기록
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    const src = sourceId ? ` (${sourceId}:${line})` : ''
    if (level === 2) logger.warn(`[renderer] ${message}${src}`)
    else if (level === 3) logger.error(`[renderer] ${message}${src}`)
  })

  // 렌더러 크래시 → 복구 시도
  win.webContents.on('render-process-gone', (_e, details) => {
    const mem = process.memoryUsage()
    logger.error('render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode,
      memoryMB: {
        rss: (mem.rss / 1024 / 1024).toFixed(1),
        heapUsed: (mem.heapUsed / 1024 / 1024).toFixed(1),
        heapTotal: (mem.heapTotal / 1024 / 1024).toFixed(1)
      }
    })

    if (details.reason === 'clean-exit') return

    if (canReload()) {
      crashRecoveryActive = true
      logger.info(`renderer crashed (${details.reason}, exitCode:${details.exitCode}) — scheduling reload`)
      setTimeout(() => {
        crashRecoveryActive = false
        if (!win.isDestroyed()) {
          logger.info('reloading renderer window')
          win.reload()
        }
      }, 800)
    } else {
      logger.error('renderer crashed too many times in 60s — not reloading')
      crashRecoveryActive = false
    }
  })

  win.on('unresponsive', () => {
    logger.warn('window unresponsive — forcing reload')
    if (!win.isDestroyed()) win.webContents.reload()
  })

  app.on('child-process-gone', (_e, details) => {
    if (details.type === 'GPU') {
      logger.error('GPU process gone', { reason: details.reason, exitCode: details.exitCode })
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  logger.info('window created')
  return win
}

// ── before-quit 차단 ───────────────────────────────────────────────────────
// macOS IMK SIGTERM → Electron app.quit() → before-quit 순서로 전파됨
// crashRecoveryActive 상태면 quit를 취소하고 창을 재시작
app.on('before-quit', (e) => {
  if (crashRecoveryActive) {
    logger.info('before-quit cancelled — crash recovery in progress')
    e.preventDefault()
  } else {
    logger.info('app quitting')
    logger.close()
  }
})

process.on('uncaughtException', (err) => {
  logger.error('uncaughtException', { message: err.message, stack: err.stack })
})
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason)
  logger.error('unhandledRejection', msg)
})

app.whenReady().then(() => {
  logger.info(`app ready — v${app.getVersion()}, electron ${process.versions.electron}, node ${process.versions.node}`)
  logger.info(`log: ${logger.getLogPath()}`)

  // dev 모드에서 Electron 기본 아이콘 대신 앱 아이콘 표시
  if (process.env['ELECTRON_RENDERER_URL']) {
    const iconPath = join(__dirname, '../../build/icon.png')
    app.dock?.setIcon(iconPath)
  }

  registerIpcHandlers()
  buildMenu()
  const win = createWindow()

  // renderer:imk-watchdog — preload이 SIGTERM을 가로채면 여기로 알림
  // GPU도 같은 SIGTERM을 받아 곧 죽으므로:
  //   1) crashRecoveryActive = true 를 즉시(동기) 세팅 → before-quit 차단
  //   2) 2초 후 GPU 재시작 완료되면 renderer reload
  // 타이밍: renderer IPC 도착(~1ms) → GPU 사망(~5ms) → before-quit(~6ms) 순이므로
  // 동기 세팅으로 before-quit 도착 전에 플래그를 잡을 수 있음
  ipcMain.on('renderer:imk-watchdog', () => {
    logger.warn('renderer:imk-watchdog — blocking quit and scheduling reload')
    crashRecoveryActive = true
    setTimeout(() => {
      crashRecoveryActive = false
      if (!win.isDestroyed()) {
        logger.info('reloading renderer after IMK watchdog recovery')
        win.webContents.reload()
      }
    }, 2000)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  logger.info('window-all-closed')
  app.quit()
})
