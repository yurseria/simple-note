// Design Ref: §5.3 Component List — SyncStatusBadge
// Plan SC: FR-25 (Pending / Synced / Conflict 상태 뱃지)

'use client'

import type { SyncStatus } from '../lib/offlineCache'
import { useT } from '../lib/i18n'
import './SyncStatusBadge.css'

interface Props {
  status: SyncStatus | 'synced' | undefined
}

export function SyncStatusBadge({ status }: Props): JSX.Element | null {
  const t = useT()
  if (!status || status === 'synced') return null
  const label =
    status === 'pending'
      ? t.pending
      : status === 'syncing'
        ? t.syncing
        : t.conflict
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
