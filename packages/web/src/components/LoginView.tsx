// Design Ref: §5.4 PWA Login — Page UI Checklist
// Plan SC: FR-10 (Google OAuth PKCE redirect), Out of Scope: 이메일 로그인

'use client'

import { useState, useEffect } from 'react'
import { RiFileTextLine, RiMoonLine, RiSunLine, RiGlobalLine } from '@remixicon/react'
import { signIn } from '../lib/cloudApi'
import { useWebTabStore } from '../lib/webTabStore'
import { useT } from '../lib/i18n'
import './LoginView.css'

export function LoginView(): JSX.Element {
  const t = useT()
  const { uiLang, setUiLang } = useWebTabStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('sn-theme') as 'dark' | 'light' | null
    const initial = saved ?? 'light'
    setTheme(initial)
    document.documentElement.dataset.theme = initial
  }, [])

  function toggleTheme(): void {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.dataset.theme = next
    localStorage.setItem('sn-theme', next)
  }

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
      <div className="login__controls">
        <button
          type="button"
          className="login__control-btn"
          onClick={() => setUiLang(uiLang === 'ko' ? 'en' : 'ko')}
          aria-label="언어 전환"
          title={uiLang === 'ko' ? 'Switch to English' : '한국어로 전환'}
        >
          <RiGlobalLine size={16} />
          <span>{uiLang.toUpperCase()}</span>
        </button>
        <button
          type="button"
          className="login__control-btn"
          onClick={toggleTheme}
          aria-label="테마 전환"
          title={theme === 'dark' ? t.themeLight : t.themeDark}
        >
          {theme === 'dark' ? <RiSunLine size={16} /> : <RiMoonLine size={16} />}
        </button>
      </div>

      <div className="login__icon">
        <RiFileTextLine size={38} />
      </div>
      <h1 className="login__title">Note</h1>
      <p className="login__sub">
        {t.loginSub.split('\n').map((line, i) => (
          <span key={i}>{line}{i === 0 ? <br /> : null}</span>
        ))}
      </p>
      <button
        type="button"
        className="sn-btn login__google"
        onClick={handleGoogle}
        disabled={loading}
      >
        <GoogleIcon />
        <span>{loading ? t.googleSigningIn : t.googleSignIn}</span>
      </button>
      {error && <div className="login__error">{error}</div>}
      <a href="/privacy" className="login__privacy">개인정보처리방침</a>
    </main>
  )
}

function GoogleIcon() {
  return (
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
}
