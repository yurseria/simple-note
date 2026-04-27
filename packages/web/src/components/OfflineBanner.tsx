// Design Ref: §5.4 Files List Mobile — OfflineBanner 상단
// Plan SC: FR-20 (오프라인 인디케이터)

'use client'

import { useCloudState } from '../lib/useCloudState'
import { useNetworkStatus } from '../lib/useNetworkStatus'
import { useT } from '../lib/i18n'
import './OfflineBanner.css'

export function OfflineBanner(): JSX.Element | null {
  // 전역 online 상태 subscribe + 이벤트 리스너 설치
  useNetworkStatus()
  const t = useT()
  const online = useCloudState((s) => s.online)
  if (online) return null
  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <span className="offline-banner__dot" aria-hidden />
      <span>{t.offlineBanner}</span>
    </div>
  )
}
