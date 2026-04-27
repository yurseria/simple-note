// Design Ref: §5.2 Flow 1 — OAuth callback
// Plan SC: FR-10 (PKCE redirect 토큰 교환)

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { handleCallback } from '../../../lib/cloudApi'

function CallbackInner(): JSX.Element {
  const router = useRouter()
  const params = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const code = params.get('code')
    const state = params.get('state')
    const err = params.get('error')

    // OAuth callback 은 URL 파라미터 기반 1회성 effect — setError 는 external(URL) 값을 React state 로 sync 하는 정당한 용례
    if (err) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(err)
      return
    }
    if (!code) {
      setError('인증 코드가 없습니다')
      return
    }

    handleCallback(code, state)
      .then(() => {
        router.replace('/files')
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e))
      })
  }, [params, router])

  return (
    <>
      {error ? (
        <>
          <div
            style={{
              color: '#e06c75',
              fontSize: 14,
              textAlign: 'center',
              maxWidth: 360,
            }}
          >
            로그인 실패: {error}
          </div>
          <button
            type="button"
            className="sn-btn"
            onClick={() => router.replace('/')}
          >
            다시 시도
          </button>
        </>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          로그인 처리 중...
        </div>
      )}
    </>
  )
}

export default function CallbackPage(): JSX.Element {
  return (
    <main
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 16,
      }}
    >
      <Suspense fallback={<div style={{ color: 'var(--text-muted)', fontSize: 13 }}>로그인 처리 중...</div>}>
        <CallbackInner />
      </Suspense>
    </main>
  )
}
