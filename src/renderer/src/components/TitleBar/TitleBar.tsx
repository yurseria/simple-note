import { useState } from 'react'
import { CustomMenu } from './CustomMenu'
import './TitleBar.css'

interface Props {
  title: string
  isEdited: boolean
}

export function TitleBar({ title, isEdited }: Props): JSX.Element {
  const isMac = window.api.platform === 'darwin'
  const [activeMenu, setActiveMenu] = useState<string | null>(null)

  return (
    <div className={`titlebar ${isMac ? 'mac' : 'windows'}`}>
      <div className="titlebar__drag" />
      
      {!isMac && (
        <CustomMenu activeMenu={activeMenu} setActiveMenu={setActiveMenu} />
      )}

      <div className="titlebar__title-container">
        <span className="titlebar__title">
          {title}
          {isEdited && <span className="titlebar__edited"> — Edited</span>}
        </span>
      </div>
    </div>
  )
}
