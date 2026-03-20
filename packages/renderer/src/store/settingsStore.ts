import { create } from 'zustand'
import { api } from '../platform'
import type { Settings } from '../types/settings'

interface SettingsStore {
  settings: Settings
  loaded: boolean
  load: () => Promise<void>
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  updateEditor: (patch: Partial<Settings['editor']>) => void
}

const defaultSettings: Settings = {
  general: { doubleEscToLeaveFullScreen: false },
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
  }
}))
