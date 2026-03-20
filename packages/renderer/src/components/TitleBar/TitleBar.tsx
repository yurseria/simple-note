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

  const handleMinimize = () => api.window?.minimize()
  const handleMaximize = () => api.window?.toggleMaximize()
  const handleClose = () => api.window?.close()

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

      {!isMac && api.runtime === 'tauri' && (
        <div className="titlebar__window-controls">
          <button className="titlebar__control-btn" onClick={handleMinimize} aria-label="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><path d="M0,0h10v1H0Z" fill="currentColor"/></svg>
          </button>
          <button className="titlebar__control-btn" onClick={handleMaximize} aria-label="Maximize">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0,0v10h10V0H0Zm9,9H1V1h8v8Z" fill="currentColor"/></svg>
          </button>
          <button className="titlebar__control-btn close" onClick={handleClose} aria-label="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4L8.6,10L10,8.6L6.4,5L10,1.4Z" fill="currentColor"/></svg>
          </button>
        </div>
      )}
    </div>
  )
}
