import { Menu, BrowserWindow, app } from 'electron'

export function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { label: `${app.name} 정보`, role: 'about' },
        { type: 'separator' },
        { label: '환경설정...', accelerator: 'CmdOrCtrl+,', click: sendToRenderer('menu:preferences') },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: '파일',
      submenu: [
        { label: '새 파일', accelerator: 'CmdOrCtrl+N', click: sendToRenderer('menu:newTab') },
        { type: 'separator' },
        { label: '열기...', accelerator: 'CmdOrCtrl+O', click: sendToRenderer('menu:open') },
        { type: 'separator' },
        { label: '저장', accelerator: 'CmdOrCtrl+S', click: sendToRenderer('menu:save') },
        { label: '다른 이름으로 저장...', accelerator: 'CmdOrCtrl+Shift+S', click: sendToRenderer('menu:saveAs') },
        { type: 'separator' },
        { label: '탭 닫기', accelerator: 'CmdOrCtrl+W', click: sendToRenderer('menu:closeTab') }
      ]
    },
    {
      label: '편집',
      submenu: [
        { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '다시 실행', accelerator: 'CmdOrCtrl+Shift+Z', role: 'redo' },
        { type: 'separator' },
        { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '전체 선택', accelerator: 'CmdOrCtrl+A', role: 'selectAll' },
        { type: 'separator' },
        // ⌘D / ⌘⇧D는 CodeMirror가 직접 처리 — 네이티브 accelerator 등록 시 키 이벤트가 webview에 도달하지 않음
        { label: '다음 일치 항목 선택 추가  ⌘D', click: sendToRenderer('menu:selectNextOccurrence') },
        { label: '모든 일치 항목 선택  ⌘⇧D', click: sendToRenderer('menu:selectAllOccurrences') }
      ]
    },
    {
      label: '보기',
      submenu: [
        { label: '줄 번호 표시/숨기기', accelerator: 'CmdOrCtrl+Shift+L', click: sendToRenderer('menu:toggleLineNumbers') },
        { type: 'separator' },
        {
          label: '언어',
          submenu: [
            { label: 'Plain Text', click: sendToRenderer('menu:setLanguage', 'plaintext') },
            { label: 'Markdown', click: sendToRenderer('menu:setLanguage', 'markdown') }
          ]
        },
        { type: 'separator' },
        {
          label: '테마',
          submenu: [
            { label: '밝게 (Light)', click: sendToRenderer('menu:setTheme', 'light') },
            { label: '어둡게 (Dark)', click: sendToRenderer('menu:setTheme', 'dark') }
          ]
        },
        { type: 'separator' },
        { label: '마크다운 미리보기', accelerator: 'CmdOrCtrl+Alt+P', click: sendToRenderer('menu:toggleMarkdownPreview') },
        { type: 'separator' },
        { label: '툴바 숨기기/표시', click: sendToRenderer('menu:toggleToolbar') },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: '이동',
      submenu: [
        { label: '줄로 이동...', accelerator: 'CmdOrCtrl+L', click: sendToRenderer('menu:gotoLine') }
      ]
    },
    {
      label: '개발',
      submenu: [
        {
          label: '개발자 도구',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => BrowserWindow.getFocusedWindow()?.webContents.toggleDevTools()
        }
      ]
    },
    {
      label: '폰트 크기',
      submenu: [
        { label: '크게', accelerator: 'CmdOrCtrl+Plus', click: sendToRenderer('menu:fontSizeUp') },
        { label: '작게', accelerator: 'CmdOrCtrl+-', click: sendToRenderer('menu:fontSizeDown') },
        { label: '기본값으로', accelerator: 'CmdOrCtrl+0', click: sendToRenderer('menu:fontSizeReset') }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  return (): void => {
    BrowserWindow.getFocusedWindow()?.webContents.send(channel, ...args)
  }
}
