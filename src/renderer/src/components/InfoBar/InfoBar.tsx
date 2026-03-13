import { useMemo } from 'react'
import type { InfoBarMode, Settings } from '../../../../types/settings'
import type { LanguageMode } from '../../../../types/tab'
import './InfoBar.css'

interface Props {
  content: string
  encoding: string
  mode: InfoBarMode
  language: LanguageMode
  countWhitespaces: boolean
  onLanguageClick: () => void
}

function computeStats(content: string, countWhitespaces: boolean) {
  const chars = countWhitespaces ? content.length : content.replace(/\s/g, '').length
  const words = content.trim() === '' ? 0 : content.trim().split(/\s+/).length
  const lines = content === '' ? 1 : content.split('\n').length
  return { chars, words, lines }
}

function LanguageBadge({ language, onClick }: { language: LanguageMode; onClick: () => void }) {
  return (
    <button className="infobar__lang" onClick={onClick} title="클릭해서 언어 전환">
      {language === 'markdown' ? 'Markdown' : 'Plain Text'}
    </button>
  )
}

export function InfoBar({ content, encoding, mode, language, countWhitespaces, onLanguageClick }: Props): JSX.Element | null {
  const { chars, words, lines } = useMemo(
    () => computeStats(content, countWhitespaces),
    [content, countWhitespaces]
  )

  if (mode === 'none') return null

  const stats = `${chars.toLocaleString()} Characters · ${words.toLocaleString()} Words · ${lines.toLocaleString()} Lines`

  if (mode === 'hud') {
    return (
      <div className="infobar infobar--hud" role="status">
        <span className="infobar__stats">{stats}</span>
        <span className="infobar__sep">·</span>
        <span className="infobar__encoding">{encoding}</span>
        <span className="infobar__sep">·</span>
        <LanguageBadge language={language} onClick={onLanguageClick} />
      </div>
    )
  }

  return (
    <div className="infobar infobar--status" role="status">
      <span className="infobar__stats">{stats}</span>
      <div className="infobar__right">
        <LanguageBadge language={language} onClick={onLanguageClick} />
        <span className="infobar__sep">·</span>
        <span className="infobar__encoding">{encoding}</span>
      </div>
    </div>
  )
}
