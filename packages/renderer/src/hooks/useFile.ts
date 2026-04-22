import { api } from '../platform'
import { useTabStore, inferLanguage } from '../store/tabStore'
import { useSettingsStore } from '../store/settingsStore'
import { deriveFilenameFromContent } from '../domain/filename'

/**
 * saveAs 다이얼로그의 기본 파일명 도출.
 * - 사용자가 명시적으로 rename 했으면(tabNameOverridden) 그 이름 사용
 * - 마크다운 이면 본문 H1 자동 추출 (FR-29, 데스크탑/PWA 공통 정책)
 * - H1 이 없거나 plaintext 이면 "Untitled-N" 탭 이름 + 확장자
 */
function defaultFileName(tab: {
  fileName: string
  language: string
  content: string
  tabNameOverridden?: boolean
}): string {
  // 이미 확장자가 있으면 그대로 사용
  if (tab.fileName.includes('.')) return tab.fileName

  // 사용자가 명시적으로 rename 한 탭은 H1 자동 변환을 건너뜀
  if (!tab.tabNameOverridden && tab.language === 'markdown') {
    const derived = deriveFilenameFromContent(tab.content, 'md')
    // '제목 없음.md' 가 되는 경우는 fallback — 탭 이름을 우선 시도
    if (!derived.startsWith('제목 없음')) return derived
  }

  const ext = tab.language === 'markdown' ? 'md' : 'txt'
  return `${tab.fileName}.${ext}`
}

export function useFile() {
  const { tabs, activeTab, addTab, markSaved, closeTab } = useTabStore()
  const { addRecentFile } = useSettingsStore()

  async function openFile(filePath?: string) {
    const result = await api.file.open(filePath)
    if (!result) return

    addRecentFile(result.filePath)
    const fileName = result.filePath.split('/').pop() ?? result.filePath
    // 이미 열려 있는 탭이면 포커스만 이동 (클로저가 아닌 최신 상태 참조)
    const existing = useTabStore.getState().tabs.find((t) => t.filePath === result.filePath)
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
            ? {
                ...t,
                content: result.content,
                encoding: result.encoding,
                language: detectedLanguage,
                showPreview: detectedLanguage === 'markdown',
              }
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
    const saved = await api.file.saveAs(tab.content, tab.encoding, defaultFileName(tab))
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
          const saved = await api.file.saveAs(tab.content, tab.encoding, defaultFileName(tab))
          if (!saved) return
        }
      }
      // response === 1: 저장하지 않고 닫기 → 그대로 closeTab 진행
    }
    closeTab(id)
  }

  return { openFile, saveFile, saveFileAs, maybeCloseTab }
}
