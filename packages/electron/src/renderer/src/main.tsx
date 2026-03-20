import React from 'react'
import ReactDOM from 'react-dom/client'
import { setPlatformApi } from '@simple-note/renderer/platform'
import { App } from '@simple-note/renderer'
import type { NoteAPI } from '@simple-note/renderer/types/api'

declare global {
  interface Window {
    electronApi: NoteAPI
  }
}

setPlatformApi(window.electronApi)

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
