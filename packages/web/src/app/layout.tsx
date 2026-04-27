// Design Ref: §5.1 — PWA root layout
// Plan SC: FR-15 (manifest — 기본 메타만, PWA 상세는 module-6)

import type { Metadata, Viewport } from 'next'
import { Nanum_Gothic_Coding } from 'next/font/google'
import { ServiceWorkerRegistrar } from '../components/ServiceWorkerRegistrar'
import './globals.css'

const nanumGothicCoding = Nanum_Gothic_Coding({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono-ko',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Note',
  description: '마크다운과 텍스트를 어디서나 열어보세요',
  manifest: '/manifest.json',
  verification: {
    google: 'vKfHBpa8MQk3iJ5GzpM1Oc0XjhgXaWGQQLxzgTX5N5E',
  },
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
    <html lang="ko" data-theme="light" className={nanumGothicCoding.variable}>
      <body>
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  )
}
