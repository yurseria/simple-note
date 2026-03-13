export type MenuItem =
  | { type: 'separator' }
  | { 
      label: string
      accelerator?: string
      action?: string
      actionArgs?: any[]
      role?: string
      submenu?: MenuItem[]
    }

export interface MenuDefinition {
  id: string
  label: string
  items: MenuItem[]
}

export const appMenuData: MenuDefinition[] = [
  {
    id: 'file',
    label: '파일',
    items: [
      { label: '새 탭 열기', accelerator: 'Ctrl+T', action: 'menu:newTab' },
      { label: '파일 열기...', accelerator: 'Ctrl+O', action: 'menu:open' },
      { type: 'separator' },
      { label: '저장', accelerator: 'Ctrl+S', action: 'menu:save' },
      { label: '다른 이름으로 저장...', accelerator: 'Ctrl+Shift+S', action: 'menu:saveAs' },
      { type: 'separator' },
      { label: '탭 닫기', accelerator: 'Ctrl+W', action: 'menu:closeTab' },
      { type: 'separator' },
      { label: '종료', role: 'quit' }
    ]
  },
  {
    id: 'edit',
    label: '편집',
    items: [
      { label: '실행 취소', accelerator: 'Ctrl+Z', role: 'undo' },
      { label: '다시 실행', accelerator: 'Ctrl+Shift+Z', role: 'redo' },
      { type: 'separator' },
      { label: '잘라내기', accelerator: 'Ctrl+X', role: 'cut' },
      { label: '복사', accelerator: 'Ctrl+C', role: 'copy' },
      { label: '붙여넣기', accelerator: 'Ctrl+V', role: 'paste' },
      { type: 'separator' },
      { label: '다음 일치 항목 선택 추가', accelerator: 'Ctrl+D', action: 'menu:selectNextOccurrence' },
      { label: '모든 일치 항목 선택', accelerator: 'Ctrl+Shift+L', action: 'menu:selectAllOccurrences' },
      { type: 'separator' },
      { label: '전체 선택', accelerator: 'Ctrl+A', role: 'selectAll' }
    ]
  },
  {
    id: 'view',
    label: '보기',
    items: [
      {
        label: '모양',
        submenu: [
          { label: '줄 번호 표시/숨기기', accelerator: 'Ctrl+Shift+L', action: 'menu:toggleLineNumbers' },
          { label: '툴바 표시/숨기기', action: 'menu:toggleToolbar' }
        ]
      },
      {
        label: '테마',
        submenu: [
          { label: '밝게 (Light)', action: 'menu:setTheme', actionArgs: ['light'] },
          { label: '어둡게 (Dark)', action: 'menu:setTheme', actionArgs: ['dark'] }
        ]
      },
      {
        label: '언어 모드',
        submenu: [
          { label: '일반 텍스트', action: 'menu:setLanguage', actionArgs: ['plaintext'] },
          { label: '마크다운', action: 'menu:setLanguage', actionArgs: ['markdown'] }
        ]
      },
      { type: 'separator' },
      {
        label: '확대/축소',
        submenu: [
          { label: '확대', accelerator: 'Ctrl+Plus', action: 'menu:fontSizeUp' },
          { label: '축소', accelerator: 'Ctrl+-', action: 'menu:fontSizeDown' },
          { label: '기본값으로 복원', accelerator: 'Ctrl+0', action: 'menu:fontSizeReset' }
        ]
      },
      { type: 'separator' },
      { label: '전체 화면 전환', role: 'togglefullscreen', accelerator: 'F11' }
    ]
  },
  {
    id: 'go',
    label: '이동',
    items: [
      { label: '지정 줄로 이동...', accelerator: 'Ctrl+G', action: 'menu:gotoLine' }
    ]
  },
  {
    id: 'help',
    label: '도움말',
    items: [
      { label: '정보', role: 'about' },
      { type: 'separator' },
      { label: '개발자 도구 전환', accelerator: 'Ctrl+Alt+I', role: 'toggleDevTools' }
    ]
  }
]
