import { useState } from 'react'
import { api } from '../../platform'
import { useCloudStore } from '../../store/cloudStore'
import './CloudButton.css'

export function CloudButton(): JSX.Element | null {
  if (!api.cloud?.isAvailable()) return null

  const { user, setUser, setLoading, setError } = useCloudStore()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleLogin = async () => {
    try {
      setLoading(true)
      setError(null)
      const u = await api.cloud!.login()
      setUser(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await api.cloud!.logout()
    setUser(null)
  }

  if (!user) {
    return (
      <button className="cloud-btn cloud-btn--login" onClick={handleLogin} title="Google로 로그인">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6.25" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 4a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>
          <path d="M3 11.5c0-1.5 1.8-2.5 4-2.5s4 1 4 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span>로그인</span>
      </button>
    )
  }

  return (
    <div className="cloud-user" onBlur={() => setMenuOpen(false)} tabIndex={-1}>
      <button
        className="cloud-user__avatar"
        onClick={() => setMenuOpen(v => !v)}
        title={user.email}
      >
        {user.picture
          ? <img src={user.picture} alt={user.name} />
          : <span>{user.name[0].toUpperCase()}</span>
        }
      </button>
      {menuOpen && (
        <div className="cloud-user__menu">
          <div className="cloud-user__info">
            <div className="cloud-user__name">{user.name}</div>
            <div className="cloud-user__email">{user.email}</div>
          </div>
          <button className="cloud-user__logout" onClick={handleLogout}>로그아웃</button>
        </div>
      )}
    </div>
  )
}
