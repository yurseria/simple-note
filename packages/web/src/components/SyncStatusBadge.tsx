// Design Ref: §5.3 Component List — SyncStatusBadge
// Plan SC: FR-25 (Pending / Synced / Conflict 상태 뱃지)

import type { SyncStatus } from '../lib/offlineCache'
import './SyncStatusBadge.css'

interface Props {
  status: SyncStatus | 'synced' | undefined
}

export function SyncStatusBadge({ status }: Props): JSX.Element | null {
  if (!status || status === 'synced') return null
  const label =
    status === 'pending'
      ? '저장 대기'
      : status === 'syncing'
        ? '동기화 중'
        : '충돌'
  return (
    <span
      className={`sync-badge sync-badge--${status}`}
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  )
}
