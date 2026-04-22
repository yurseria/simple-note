// Design Ref: §5.4 Files List Mobile — OfflineBanner 상단
// Plan SC: FR-20 (오프라인 인디케이터)

'use client'

import { useCloudState } from '../lib/useCloudState'
import { useNetworkStatus } from '../lib/useNetworkStatus'
import './OfflineBanner.css'

export function OfflineBanner(): JSX.Element | null {
  // 전역 online 상태 subscribe + 이벤트 리스너 설치
  useNetworkStatus()
  const online = useCloudState((s) => s.online)
  if (online) return null
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-banner__dot" aria-hidden />
      <span>오프라인 — 캐시된 파일만 읽을 수 있고 편집은 저장 대기열에 추가됩니다</span>
    </div>
  )
}
