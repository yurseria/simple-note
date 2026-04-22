// Design Ref: §5.4 PWA Login — Page UI Checklist
// Plan SC: FR-10 (Google OAuth PKCE redirect), Out of Scope: 이메일 로그인

'use client'

import { useState } from 'react'
import { signIn } from '../lib/cloudApi'
import './LoginView.css'

// Remix Icon `ri-file-text-line` 24×24 — Plan/Design §10.4 아이콘 규칙 (inline SVG)
const ICON_FILE_TEXT =
  'M21 8v12.993A1 1 0 0 1 20.007 22H3.993A.993.993 0 0 1 3 21.008V2.992C3 2.444 3.445 2 3.993 2H14v7h7zm-2 0h-5V3H5v16h14V8zM8 12h8v2H8v-2zm0 4h8v2H8v-2zm0-8h3v2H8V8z'

// Google brand icon (공식 G 로고 path)
const GOOGLE_ICON = (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden>
    <path
      d="M18.17 10.23c0-.63-.05-1.24-.16-1.82H10v3.44h4.58a3.93 3.93 0 01-1.7 2.58v2.14h2.75c1.61-1.48 2.54-3.67 2.54-6.34z"
      fill="#4285F4"
    />
    <path
      d="M10 18.2c2.3 0 4.23-.76 5.64-2.06l-2.75-2.14c-.76.51-1.74.81-2.89.81-2.22 0-4.1-1.5-4.77-3.51H2.4v2.2A8.5 8.5 0 0010 18.2z"
      fill="#34A853"
    />
    <path
      d="M5.23 11.3a5.1 5.1 0 010-3.26V5.84H2.4a8.5 8.5 0 000 7.66l2.83-2.2z"
      fill="#FBBC04"
    />
    <path
      d="M10 4.53c1.25 0 2.37.43 3.25 1.27l2.44-2.44A8.5 8.5 0 002.4 5.84l2.83 2.2C5.9 6.03 7.78 4.53 10 4.53z"
      fill="#EA4335"
    />
  </svg>
)

export function LoginView(): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogle() {
    setLoading(true)
    setError(null)
    try {
      await signIn()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setLoading(false)
    }
  }

  return (
    <main className="login">
      <div className="login__icon">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor">
          <path d={ICON_FILE_TEXT} />
        </svg>
      </div>
      <h1 className="login__title">Note</h1>
      <p className="login__sub">
        마크다운과 텍스트를
        <br />
        어디서나 열어보세요
      </p>
      <button
        type="button"
        className="sn-btn login__google"
        onClick={handleGoogle}
        disabled={loading}
      >
        {GOOGLE_ICON}
        <span>{loading ? 'Google 로 이동 중...' : 'Google로 계속하기'}</span>
      </button>
      {error && <div className="login__error">{error}</div>}
    </main>
  )
}
