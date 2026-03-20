import React from 'react'
import ReactDOM from 'react-dom/client'
import { setPlatformApi } from '@simple-note/renderer/platform'
import { App } from '@simple-note/renderer'
import { tauriApi, initTauriPlatform } from './api'

async function bootstrap() {
  await initTauriPlatform()
  setPlatformApi(tauriApi)

  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
