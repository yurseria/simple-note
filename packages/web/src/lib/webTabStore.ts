'use client'

import { create } from 'zustand'

export interface WebTab {
  id: string
  name: string
}

interface WebTabState {
  tabs: WebTab[]
  activeId: string | null
  newCounter: number
  uiLang: 'ko' | 'en'
  nextNewId: () => string
  openTab: (tab: WebTab) => void
  closeTab: (id: string) => string | null
  setActive: (id: string) => void
  updateTabName: (id: string, name: string) => void
  setUiLang: (lang: 'ko' | 'en') => void
}

export const useWebTabStore = create<WebTabState>((set, get) => ({
  tabs: [],
  activeId: null,
  newCounter: 0,
  uiLang: 'ko',
  nextNewId: () => {
    const n = get().newCounter + 1
    set({ newCounter: n })
    return `new-${n}`
  },
  setUiLang: (lang) => set({ uiLang: lang }),
  openTab: (tab) =>
    set((s) => {
      const exists = s.tabs.find((t) => t.id === tab.id)
      return {
        tabs: exists
          ? s.tabs.map((t) => (t.id === tab.id ? { ...t, name: tab.name } : t))
          : [...s.tabs, tab],
        activeId: tab.id,
      }
    }),
  closeTab: (id) => {
    const { tabs } = get()
    const idx = tabs.findIndex((t) => t.id === id)
    const next = tabs.filter((t) => t.id !== id)
    set({ tabs: next })
    if (next.length === 0) return null
    const nextActive = next[Math.max(0, idx - 1)]
    set({ activeId: nextActive.id })
    return nextActive.id
  },
  setActive: (id) => set({ activeId: id }),
  updateTabName: (id, name) =>
    set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, name } : t)) })),
}))
