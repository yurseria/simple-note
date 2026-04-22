// Design Ref: §7 Security — Token 저장 (localStorage, XSS 리스크 인지)
// Plan SC: FR-10 (PWA OAuth redirect flow)
//
// NOTE: localStorage 는 XSS 에 취약하나 최소 권한 scope(drive.file)로 리스크를 제한.
// 추후 BFF + httpOnly cookie 전환을 고려할 수 있음 (Plan Risk).

export interface TokenData {
  accessToken: string
  refreshToken?: string
  expiresAt: number
}

export interface StoredUser {
  id: string
  name: string
  email: string
  picture?: string
}

export interface StoredFolder {
  folderId: string
  folderName: string
}

const TOKEN_KEY = 'sn.cloud.token'
const USER_KEY = 'sn.cloud.user'
const FOLDER_KEY = 'sn.cloud.folder'
const PKCE_VERIFIER_KEY = 'sn.cloud.pkce'
const OAUTH_STATE_KEY = 'sn.cloud.oauth-state'

function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// ── token ─────────────────────────────────────────

export function loadToken(): TokenData | null {
  const ls = safeLocalStorage()
  if (!ls) return null
  const raw = ls.getItem(TOKEN_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as TokenData
  } catch {
    ls.removeItem(TOKEN_KEY)
    return null
  }
}

export function saveToken(data: TokenData): void {
  safeLocalStorage()?.setItem(TOKEN_KEY, JSON.stringify(data))
}

export function clearToken(): void {
  safeLocalStorage()?.removeItem(TOKEN_KEY)
}

export function isTokenFresh(data: TokenData | null, skewMs = 60_000): boolean {
  if (!data) return false
  return Date.now() < data.expiresAt - skewMs
}

// ── user ──────────────────────────────────────────

export function loadUser(): StoredUser | null {
  const ls = safeLocalStorage()
  if (!ls) return null
  const raw = ls.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch {
    return null
  }
}

export function saveUser(user: StoredUser): void {
  safeLocalStorage()?.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser(): void {
  safeLocalStorage()?.removeItem(USER_KEY)
}

// ── folder ────────────────────────────────────────

export function loadFolder(): StoredFolder | null {
  const ls = safeLocalStorage()
  if (!ls) return null
  const raw = ls.getItem(FOLDER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredFolder
  } catch {
    return null
  }
}

export function saveFolder(folder: StoredFolder): void {
  safeLocalStorage()?.setItem(FOLDER_KEY, JSON.stringify(folder))
}

export function clearFolder(): void {
  safeLocalStorage()?.removeItem(FOLDER_KEY)
}

// ── PKCE verifier (redirect flow 용) ──────────────

export function savePkceVerifier(verifier: string): void {
  safeLocalStorage()?.setItem(PKCE_VERIFIER_KEY, verifier)
}

export function loadPkceVerifier(): string | null {
  return safeLocalStorage()?.getItem(PKCE_VERIFIER_KEY) ?? null
}

export function clearPkceVerifier(): void {
  safeLocalStorage()?.removeItem(PKCE_VERIFIER_KEY)
}

// ── OAuth state (CSRF 방어 — Design §7 Security) ───

export function saveOauthState(state: string): void {
  safeLocalStorage()?.setItem(OAUTH_STATE_KEY, state)
}

export function loadOauthState(): string | null {
  return safeLocalStorage()?.getItem(OAUTH_STATE_KEY) ?? null
}

export function clearOauthState(): void {
  safeLocalStorage()?.removeItem(OAUTH_STATE_KEY)
}

// ── 전체 초기화 (logout) ──────────────────────────

export function clearAllCloudStorage(): void {
  clearToken()
  clearUser()
  clearFolder()
  clearPkceVerifier()
  clearOauthState()
}
