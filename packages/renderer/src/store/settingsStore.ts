import { create } from 'zustand'
import { api } from '../platform'
import type { Settings } from '../types/settings'

interface SettingsStore {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  updateEditor: (patch: Partial<Settings['editor']>) => void
  updateUI: (patch: Partial<NonNullable<Settings['ui']>>) => void
  addRecentFile: (filePath: string) => void
}

const defaultSettings: Settings = {
  general: { doubleEscToLeaveFullScreen: false, recentFiles: [] },
  editor: {
    fontFamily: 'Pretendard',
    fontSize: 14,
    lineNumbersFontSize: 13,
    theme: 'dark',
    infoBarMode: 'hud',
    showLineNumbers: false,
    smartSubstitutions: false,
    spellingCheck: false,
    useSpacesForTabs: false,
    tabSize: 4,
    countWhitespacesInChars: false,
    keepIndentOnNewLines: true
  },
  ui: {
    sidebarOpen: true,
    sidebarWidth: 220
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  loaded: false,

  load: async () => {
    const settings = await api.settings.get()
    set({ settings, loaded: true })

    api.settings.onChange?.((key, value) => {
      set((s) => ({ settings: { ...s.settings, [key]: value } }))
    })
  },

  update: (key, value) => {
    set((s) => ({ settings: { ...s.settings, [key]: value } }))
    api.settings.set(key, value)
    if (key === 'language') {
      api.menu.onLanguageChange?.(value as string)
    }
  },

  updateEditor: (patch) => {
    const next = { ...get().settings.editor, ...patch }
    set((s) => ({ settings: { ...s.settings, editor: next } }))
    api.settings.set('editor', next)
  },

  updateUI: (patch) => {
    const prev = get().settings.ui ?? { sidebarOpen: true, sidebarWidth: 220 }
    const next = { ...prev, ...patch }
    set((s) => ({ settings: { ...s.settings, ui: next } }))
    api.settings.set('ui', next)
  },

  addRecentFile: (filePath) => {
    const general = get().settings.general
    const recent = [filePath, ...(general.recentFiles || []).filter(p => p !== filePath)].slice(0, 10)
    const next = { ...general, recentFiles: recent }
    set((s) => ({ settings: { ...s.settings, general: next } }))
    api.settings.set('general', next)
  }
}))
