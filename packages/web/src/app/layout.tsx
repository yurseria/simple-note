// Design Ref: §5.1 — PWA root layout
// Plan SC: FR-15 (manifest — 기본 메타만, PWA 상세는 module-6)

import type { Metadata, Viewport } from 'next'
import { ServiceWorkerRegistrar } from '../components/ServiceWorkerRegistrar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Note',
  description: '마크다운과 텍스트를 어디서나 열어보세요',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Note',
  },
  icons: {
    icon: '/icons/icon-192.svg',
    apple: '/icons/icon-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#282c34',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" data-theme="dark">
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
