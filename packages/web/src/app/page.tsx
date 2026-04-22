// Design Ref: §5.2 Flow 1 — 비로그인/로그인 분기
// Plan SC: FR-10 (로그인 화면), FR-11 (로그인 시 목록 접근)

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoginView } from '../components/LoginView'
import { isAuthenticated } from '../lib/cloudApi'

export default function HomePage() {
  const router = useRouter()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/files')
    } else {
      // 인증 확인 후 한 번만 전환 — 초기화 목적이라 cascading 위험 없음
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setChecked(true)
    }
  }, [router])

  if (!checked) {
    return (
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: 13,
        }}
      >
        로딩 중...
      </main>
    )
  }

  return <LoginView />
}
