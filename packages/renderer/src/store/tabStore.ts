import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from '../utils/nanoid'
import type { TabState, LanguageMode } from '../types/tab'

import { LanguageDescription } from '@codemirror/language'
import { languages } from '@codemirror/language-data'

export function inferLanguage(filePath: string | null): LanguageMode {
  if (!filePath) return 'plaintext'
  const fileName = filePath.split('/').pop() || ''
  const desc = LanguageDescription.matchFilename(languages, fileName)
  if (desc) return desc.name
  
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext === 'md' || ext === 'markdown') return 'markdown'
  if (ext === 'txt') return 'plaintext'
  return 'plaintext'
}

function nextUntitledName(tabs: TabState[]): string {
  const used = new Set(
    tabs
      .map((t) => t.fileName.match(/^Untitled-(\d+)$/)?.[1])
      .filter(Boolean)
      .map(Number)
  )
  let n = 1
  while (used.has(n)) n++
  return `Untitled-${n}`
}

function newTab(overrides?: Partial<TabState>, existingTabs?: TabState[]): TabState {
  const fileName = overrides?.fileName ?? nextUntitledName(existingTabs ?? [])
  const base: TabState = {
    id: nanoid(),
    filePath: null,
    fileName,
    content: '',
    encoding: 'UTF-8',
    isDirty: false,
    language: 'plaintext',
    languageOverridden: false,
    showPreview: false,
    tabNameOverridden: false,
    ...overrides
  }
  // markdown 언어로 생성되는 탭은 미리보기 기본 활성화
  if (base.language === 'markdown' && overrides?.showPreview === undefined) {
    base.showPreview = true
  }
  return base
}

interface TabStore {
  tabs: TabState[]
  activeId: string
  activeTab: () => TabState | undefined

  addTab: (tab?: Partial<TabState>) => string
  closeTab: (id: string) => void
  setActive: (id: string) => void
  moveTab: (fromIndex: number, toIndex: number) => void

  updateContent: (id: string, content: string) => void
  markSaved: (id: string, filePath: string) => void
  setLanguage: (id: string, language: LanguageMode, overridden?: boolean) => void
  togglePreview: (id: string) => void
  renameTab: (id: string, name: string) => void
}

const initial = newTab(undefined, [])

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
  tabs: [initial],
  activeId: initial.id,

  activeTab: () => get().tabs.find((t) => t.id === get().activeId),

  addTab: (overrides) => {
    const tab = newTab(overrides, get().tabs)
    set((s) => ({ tabs: [...s.tabs, tab], activeId: tab.id }))
    return tab.id
  },

  closeTab: (id) => {
    const { tabs, activeId } = get()
    if (tabs.length === 1) {
      const fresh = newTab(undefined, [])
      set({ tabs: [fresh], activeId: fresh.id })
      return
    }
    const idx = tabs.findIndex((t) => t.id === id)
    const next = tabs.filter((t) => t.id !== id)
    const nextActive =
      activeId === id
        ? (next[idx] ?? next[idx - 1])?.id ?? next[0].id
        : activeId
    set({ tabs: next, activeId: nextActive })
  },

  setActive: (id) => set({ activeId: id }),

  moveTab: (fromIndex, toIndex) => {
    set((s) => {
      const tabs = [...s.tabs]
      const [moved] = tabs.splice(fromIndex, 1)
      tabs.splice(toIndex, 0, moved)
      return { tabs }
    })
  },

  updateContent: (id, content) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t
        let fileName = t.fileName
        if (t.language === 'markdown' && !t.tabNameOverridden) {
          const h1 = content.match(/^#[ \t]+(.+)/m)?.[1]?.trim()
          if (h1) {
            fileName = h1
          } else {
            fileName = t.filePath ? (t.filePath.split('/').pop() ?? 'Untitled') : 'Untitled'
          }
        }
        return { ...t, content, isDirty: true, fileName }
      })
    }))
  },

  markSaved: (id, filePath) => {
    const language = inferLanguage(filePath)
    const fileName = filePath.split('/').pop() ?? filePath
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id
          ? {
              ...t,
              filePath,
              fileName,
              isDirty: false,
              language: t.languageOverridden ? t.language : language
            }
          : t
      )
    }))
  },

  setLanguage: (id, language, overridden = true) => {
    set((s) => ({
      tabs: s.tabs.map((t) => {
        if (t.id !== id) return t
        return {
          ...t,
          language,
          languageOverridden: overridden,
          // markdown으로 전환하면 미리보기 자동 활성화
          showPreview: language === 'markdown' ? true : t.showPreview
        }
      })
    }))
  },

  togglePreview: (id) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, showPreview: !t.showPreview } : t
      )
    }))
  },

  renameTab: (id, name) => {
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.id === id ? { ...t, fileName: name, tabNameOverridden: true } : t
      )
    }))
  }
    }),
    {
      name: 'tab-session',
      partialize: (state) => ({ tabs: state.tabs, activeId: state.activeId })
    }
  )
)
