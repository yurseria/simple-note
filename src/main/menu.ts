import { Menu, BrowserWindow, app, ipcMain } from 'electron'

const isMac = process.platform === 'darwin'

export function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    // macOS 전용 앱 메뉴 (VSCode와 동일하게 macOS에서는 앱 이름 메뉴 제공)
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { label: `${app.name} 정보`, role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const }
          ]
        }]
      : []),
    {
      id: 'file',
      label: '파일',
      submenu: [
        { label: '새 탭 열기', accelerator: 'CmdOrCtrl+T', click: sendToRenderer('menu:newTab') },
        { label: '파일 열기...', accelerator: 'CmdOrCtrl+O', click: sendToRenderer('menu:open') },
        { type: 'separator' },
        { label: '저장', accelerator: 'CmdOrCtrl+S', click: sendToRenderer('menu:save') },
        { label: '다른 이름으로 저장...', accelerator: 'CmdOrCtrl+Shift+S', click: sendToRenderer('menu:saveAs') },
        { type: 'separator' },
        { label: '탭 닫기', accelerator: 'CmdOrCtrl+W', click: sendToRenderer('menu:closeTab') },
        ...(!isMac ? [
          { type: 'separator' },
          { label: '종료', role: 'quit' as const }
        ] as Electron.MenuItemConstructorOptions[] : [])
      ]
    },
    {
      id: 'edit',
      label: '편집',
      submenu: [
        { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '다시 실행', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { type: 'separator' },
        // CodeMirror에서 단축키를 직접 처리하므로 네이티브 accelerator를 등록하지 않고 텍스트로만 표시
        { label: '다음 일치 항목 선택 추가  (Cmd/Ctrl+D)', click: sendToRenderer('menu:selectNextOccurrence') },
        { label: '모든 일치 항목 선택  (Cmd/Ctrl+Shift+L)', click: sendToRenderer('menu:selectAllOccurrences') },
        { type: 'separator' },
        { label: '전체 선택', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      id: 'view',
      label: '보기',
      submenu: [
        {
          label: '모양',
          submenu: [
            { label: '줄 번호 표시/숨기기', accelerator: 'CmdOrCtrl+Shift+L', click: sendToRenderer('menu:toggleLineNumbers') },
            { label: '툴바 표시/숨기기', click: sendToRenderer('menu:toggleToolbar') }
          ]
        },
        {
          label: '테마',
          submenu: [
            { label: '밝게 (Light)', click: sendToRenderer('menu:setTheme', 'light') },
            { label: '어둡게 (Dark)', click: sendToRenderer('menu:setTheme', 'dark') }
          ]
        },
        {
          label: '언어 모드',
          submenu: [
            { label: '일반 텍스트', click: sendToRenderer('menu:setLanguage', 'plaintext') },
            { label: '마크다운', click: sendToRenderer('menu:setLanguage', 'markdown') }
          ]
        },
        { type: 'separator' },
        {
          label: '확대/축소',
          submenu: [
            { label: '확대', accelerator: 'CmdOrCtrl+Plus', click: sendToRenderer('menu:fontSizeUp') },
            { label: '축소', accelerator: 'CmdOrCtrl+-', click: sendToRenderer('menu:fontSizeDown') },
            { label: '기본값으로 복원', accelerator: 'CmdOrCtrl+0', click: sendToRenderer('menu:fontSizeReset') }
          ]
        },
        { type: 'separator' },
        { label: '전체 화면 전환', role: 'togglefullscreen' }
      ]
    },
    {
      id: 'go',
      label: '이동',
      submenu: [
        { label: '지정 줄로 이동...', accelerator: 'CmdOrCtrl+G', click: sendToRenderer('menu:gotoLine') }
      ]
    },
    {
      id: 'help',
      label: '도움말',
      submenu: [
        {
          label: '개발자 도구 전환',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools()
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  // 중복 등록 방지
  if (!ipcMain.listenerCount('menu:popup')) {
    ipcMain.on('menu:popup', (event, menuId: string, x: number, y: number) => {
      const window = BrowserWindow.fromWebContents(event.sender)
      if (!window) return
      
      const appMenu = Menu.getApplicationMenu()
      if (!appMenu) return

      const menuItem = appMenu.getMenuItemById(menuId)
      if (menuItem && menuItem.submenu) {
        menuItem.submenu.popup({ 
          window, 
          x, 
          y,
          callback: () => {
            if (!window.isDestroyed()) {
              window.webContents.send('menu:closed', menuId)
            }
          }
        })
      }
    })
  }
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  return (): void => {
    BrowserWindow.getFocusedWindow()?.webContents.send(channel, ...args)
  }
}
