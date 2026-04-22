// Design Ref: §5.4 PWA Editor — Bottom bar (모바일 저장/다운로드/상태)
// Plan SC: FR-14 (저장 버튼 + 클라우드 표시), FR-17 (다운로드 버튼)

'use client'

import './BottomBar.css'

const ICON_DOWNLOAD =
  'M13 10h5l-6 6-6-6h5V3h2v7zm-9 9h16v2H4v-2z'

interface Props {
  statusText: string
  isDirty: boolean
  saving: boolean
  onSave: () => void
  onDownload: () => void
  saveDisabled?: boolean
}

export function BottomBar({
  statusText,
  isDirty,
  saving,
  onSave,
  onDownload,
  saveDisabled,
}: Props): JSX.Element {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar__info">{statusText}</div>
      <div className="bottom-bar__actions">
        <button
          type="button"
          className="sn-icon-btn bottom-bar__dl"
          onClick={onDownload}
          title="다운로드"
          aria-label="다운로드"
        >
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="currentColor"
          >
            <path d={ICON_DOWNLOAD} />
          </svg>
        </button>
        <button
          type="button"
          className="bottom-bar__save"
          onClick={onSave}
          disabled={saveDisabled || saving || !isDirty}
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
