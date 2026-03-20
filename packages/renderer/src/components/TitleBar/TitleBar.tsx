import { useState } from 'react'
import { api } from '../../platform'
import { CustomMenu } from './CustomMenu'
import './TitleBar.css'

interface Props {
  title: string
  isEdited: boolean
}

export function TitleBar({ title, isEdited }: Props): JSX.Element {
  const isMac = api.platform === 'darwin'
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const dragProps = api.runtime === 'tauri' ? { 'data-tauri-drag-region': true } as Record<string, unknown> : {}

  return (
    <div className={`titlebar ${isMac ? 'mac' : 'windows'}`} {...dragProps}>
      {api.runtime === 'electron' && <div className="titlebar__drag" />}

      {!isMac && (
        <CustomMenu activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      )}

      <div className="titlebar__title-container" {...dragProps}>
        <span className="titlebar__title" {...dragProps}>
          {title}
          {isEdited && <span className="titlebar__edited" {...dragProps}> — Edited</span>}
        </span>
      </div>
    </div>
  )
}
