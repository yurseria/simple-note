// Design Ref: Plan §2.1 PWA service worker registration
// Design Ref: §11.2 Module 6
//
// 등록은 프로덕션 빌드에서만 — dev 모드는 Next.js HMR 과 상호작용 이슈 방지.

'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistrar(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    // next dev 에서는 SW 등록하지 않음 (HMR 간섭)
    if (process.env.NODE_ENV !== 'production') return

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch((err) => {
          console.warn('[sw] register failed:', err)
        })
    }

    if (document.readyState === 'complete') {
      onLoad()
    } else {
      window.addEventListener('load', onLoad, { once: true })
      return () => window.removeEventListener('load', onLoad)
    }
  }, [])

  return null
}
