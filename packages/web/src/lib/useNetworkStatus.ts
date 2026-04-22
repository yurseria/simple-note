// Design Ref: §4.3 — useNetworkStatus hook
// Plan SC: FR-20 (오프라인 감지)

'use client'

import { useEffect } from 'react'
import { useCloudState } from './useCloudState'

/**
 * navigator.onLine + online/offline 이벤트로 useCloudState.online 을 동기화.
 * App layout 의 client root 에서 한 번만 호출하면 전역 반영.
 */
export function useNetworkStatus(): { online: boolean } {
  const online = useCloudState((s) => s.online)
  const setOnline = useCloudState((s) => s.setOnline)

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    // 초기값 동기화
    setOnline(navigator.onLine)

    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [setOnline])

  return { online }
}
