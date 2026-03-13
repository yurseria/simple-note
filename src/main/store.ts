import Store from 'electron-store'
import type { Settings } from '../types/settings'

const defaults: Settings = {
  general: {
    doubleEscToLeaveFullScreen: false
  },
  editor: {
    fontFamily: 'Hack Nerd Font',
    fontSize: 14,
    lineNumbersFontSize: 10,
    theme: 'dark',
    infoBarMode: 'hud',
    showLineNumbers: false,
    smartSubstitutions: false,
    spellingCheck: false,
    useSpacesForTabs: false,
    tabSize: 4,
    countWhitespacesInChars: false,
    keepIndentOnNewLines: true
  }
}

export const store = new Store<Settings>({
  defaults,
  migrations: {
    '0.1.1': (s) => {
      // 폰트 기본값을 SF Mono → Hack Nerd Font 로 마이그레이션
      if ((s.store as Settings).editor?.fontFamily === 'SF Mono') {
        s.set('editor.fontFamily', 'Hack Nerd Font')
      }
    }
  }
})
