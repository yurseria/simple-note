// Design Ref: §5.4 PWA Editor — Bottom bar (모바일 저장/다운로드/상태)
// Plan SC: FR-14 (저장 버튼 + 클라우드 표시), FR-17 (다운로드 버튼)

'use client'

import { Download } from 'lucide-react'
import { useT } from '../lib/i18n'
import './BottomBar.css'

interface Props {
  statusText: string
  isDirty: boolean
  saving: boolean
  onSave: () => void
  onDownload: () => void
  saveDisabled?: boolean
  content: string
  isMarkdown: boolean
}

export function BottomBar({
  statusText,
  isDirty,
  saving,
  onSave,
  onDownload,
  saveDisabled,
  content,
  isMarkdown,
}: Props): JSX.Element {
  const t = useT()
  const chars = content.length
  const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length
  const lines = content === '' ? 0 : content.split('\n').length
  const stats = [t.hudChar(chars), t.hudWord(words), t.hudLine(lines)].join(' · ')
  return (
    <div className="bottom-bar">
      <div className="bottom-bar__stats">{stats}</div>
      <div className="bottom-bar__info">
        <span>{isMarkdown ? 'Markdown' : t.plainText}</span>
        <span className="bottom-bar__sep">·</span>
        <span>UTF-8</span>
        <span className="bottom-bar__sep">·</span>
        <span>{statusText}</span>
      </div>
      <div className="bottom-bar__actions">
        <button
          type="button"
          className="sn-icon-btn bottom-bar__dl"
          onClick={onDownload}
          title={t.download}
          aria-label={t.download}
        >
          <Download size={18} />
        </button>
        <button
          type="button"
          className="bottom-bar__save"
          onClick={onSave}
          disabled={saveDisabled || saving || !isDirty}
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </div>
  )
}
