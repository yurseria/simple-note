export type InfoBarMode = 'none' | 'hud' | 'status'
export type ThemeName = 'light' | 'dark'

export interface Settings {
  general: {
    doubleEscToLeaveFullScreen: boolean
  }
  editor: {
    fontFamily: string
    fontSize: number
    lineNumbersFontSize: number
    theme: ThemeName
    infoBarMode: InfoBarMode
    showLineNumbers: boolean
    smartSubstitutions: boolean
    spellingCheck: boolean
    useSpacesForTabs: boolean
    tabSize: number
    countWhitespacesInChars: boolean
    keepIndentOnNewLines: boolean
  }
}
