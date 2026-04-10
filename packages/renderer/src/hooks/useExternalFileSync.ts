import { useEffect, useRef } from 'react'
import { api } from '../platform'
import { useTabStore } from '../store/tabStore'

/**
 * 윈도우 포커스 시 열린 파일의 외부 변경을 감지하여 동기화.
 * - dirty 상태가 아닌 탭만 자동 갱신
 * - dirty 탭은 무시 (사용자 편집 보호)
 */
export function useExternalFileSync() {
  const isSyncing = useRef(false)

  useEffect(() => {
    async function syncOpenFiles() {
      if (isSyncing.current) return
      isSyncing.current = true

      try {
        const { tabs } = useTabStore.getState()

        for (const tab of tabs) {
          if (!tab.filePath || tab.isDirty) continue

          try {
            const result = await api.file.read(tab.filePath)
            if (result.content !== tab.content) {
              useTabStore.setState((s) => ({
                tabs: s.tabs.map((t) =>
                  t.id === tab.id
                    ? { ...t, content: result.content, encoding: result.encoding }
                    : t
                )
              }))
            }
          } catch {
            // 파일이 삭제됐거나 접근 불가 — 무시
          }
        }
      } finally {
        isSyncing.current = false
      }
    }

    function handleFocus() {
      syncOpenFiles()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [])
}
