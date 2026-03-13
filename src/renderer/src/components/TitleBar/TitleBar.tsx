import './TitleBar.css'

interface Props {
  title: string
  isEdited: boolean
}

export function TitleBar({ title, isEdited }: Props): JSX.Element {
  return (
    <div className="titlebar">
      <div className="titlebar__drag" />
      <span className="titlebar__title">
        {title}
        {isEdited && <span className="titlebar__edited"> — Edited</span>}
      </span>
    </div>
  )
}
