import { api } from '../platform'
import { useTabStore, inferLanguage } from '../store/tabStore'
import { useSettingsStore } from '../store/settingsStore'

export function useFile() {
  const { tabs, activeTab, addTab, markSaved, closeTab } = useTabStore()
  const { addRecentFile } = useSettingsStore()

  async function openFile(filePath?: string) {
    const result = await api.file.open(filePath)
    if (!result) return

    addRecentFile(result.filePath)
    const fileName = result.filePath.split('/').pop() ?? result.filePath
    // 이미 열려 있는 탭이면 포커스만 이동
    const existing = tabs.find((t) => t.filePath === result.filePath)
    if (existing) {
      useTabStore.getState().setActive(existing.id)
      return
    }

    const detectedLanguage = inferLanguage(result.filePath)

    // 현재 탭이 빈 새 탭이면 재사용
    const current = activeTab()
    if (current && !current.filePath && !current.isDirty && current.content === '') {
      markSaved(current.id, result.filePath)
      useTabStore.setState((s) => ({
        tabs: s.tabs.map((t) =>
          t.id === current.id
            ? { ...t, content: result.content, encoding: result.encoding, language: detectedLanguage }
            : t
        )
      }))
      return
    }

    addTab({
      filePath: result.filePath,
      fileName,
      content: result.content,
      encoding: result.encoding,
      language: detectedLanguage,
      isDirty: false
    })
  }

  async function saveFile() {
    const tab = activeTab()
    if (!tab) return
    if (tab.filePath) {
      await api.file.save(tab.filePath, tab.content, tab.encoding)
      markSaved(tab.id, tab.filePath)
    } else {
      await saveFileAs()
    }
  }

  async function saveFileAs() {
    const tab = activeTab()
    if (!tab) return
    const saved = await api.file.saveAs(tab.content, tab.encoding, tab.fileName)
    if (saved) {
      markSaved(tab.id, saved)
      addRecentFile(saved)
    }
  }

  async function maybeCloseTab(id: string) {
    const tab = tabs.find((t) => t.id === id)
    if (!tab) return
    if (tab.isDirty) {
      const response = await api.dialog.confirmClose(tab.fileName)
      // 0: save, 1: close without saving, 2: cancel
      if (response === 2) return // 취소
      if (response === 0) {
        // 저장 후 닫기
        if (tab.filePath) {
          await api.file.save(tab.filePath, tab.content, tab.encoding)
        } else {
          const saved = await api.file.saveAs(tab.content, tab.encoding, tab.fileName)
          if (!saved) return
        }
      }
      // response === 1: 저장하지 않고 닫기 → 그대로 closeTab 진행
    }
    closeTab(id)
  }

  return { openFile, saveFile, saveFileAs, maybeCloseTab }
}
