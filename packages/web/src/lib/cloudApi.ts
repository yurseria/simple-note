// Design Ref: §4.1 Drive API, §4.3 Internal Module API
// Plan SC: FR-10 (OAuth PKCE redirect), FR-26 (폴더 부트스트랩),
//          FR-27 (flat 구조), FR-28 (drive.file scope), FR-30 (중복 자동 suffix)
//
// 경계 규칙 (§9.3): renderer 에서 domain/* 와 types/* 만 import

import type { DriveFile } from '@simple-note/renderer/types/api'
import {
  DRIVE_MIME,
  OAUTH_SCOPES,
  SIMPLE_NOTE_FOLDER_NAME,
} from '@simple-note/renderer/domain/driveFolder'
import { planFolderMigration } from '@simple-note/renderer/domain/migration'
import { resolveUniqueName } from '@simple-note/renderer/domain/filename'
import {
  cachedFileIds,
  loadContent,
  loadMetadataList,
  removeMetadata,
  saveContent as cacheSaveContent,
  saveMetadataList,
  touchLastAccess,
  clearAllCache,
} from './offlineCache'
import {
  clearAllCloudStorage,
  clearOauthState,
  clearPkceVerifier,
  isTokenFresh,
  loadFolder,
  loadOauthState,
  loadPkceVerifier,
  loadToken,
  loadUser,
  saveFolder,
  saveOauthState,
  savePkceVerifier,
  saveToken,
  saveUser,
  type StoredUser,
  type TokenData,
} from './token'

/** Drive 응답에 headRevisionId 를 포함해서 확장 타입으로 다룬다. */
export interface DriveFileWithEtag extends DriveFile {
  etag: string
}

// ── sessionStorage 파일 목록 캐시 (TTL 5분) ───────────────────────
const SESSION_FILES_KEY = 'sn_files_cache'
const SESSION_FILES_TTL = 5 * 60 * 1000

// ── sessionStorage 파일 내용 캐시 (TTL 3분) ──────────────────────
const SESSION_CONTENT_PREFIX = 'sn_content_'
const SESSION_CONTENT_TTL = 3 * 60 * 1000

interface SessionContentCache {
  content: string
  etag: string
  name?: string
  ts: number
}

function loadSessionContent(fileId: string): ReadFileResult | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(`${SESSION_CONTENT_PREFIX}${fileId}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionContentCache
    if (Date.now() - parsed.ts > SESSION_CONTENT_TTL) return null
    return { content: parsed.content, etag: parsed.etag, name: parsed.name }
  } catch { return null }
}

function saveSessionContent(fileId: string, result: ReadFileResult): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    const entry: SessionContentCache = { content: result.content, etag: result.etag, name: result.name, ts: Date.now() }
    sessionStorage.setItem(`${SESSION_CONTENT_PREFIX}${fileId}`, JSON.stringify(entry))
  } catch {}
}

function clearSessionContent(fileId: string): void {
  if (typeof sessionStorage === 'undefined') return
  try { sessionStorage.removeItem(`${SESSION_CONTENT_PREFIX}${fileId}`) } catch {}
}

interface SessionFilesCache {
  files: DriveFileWithEtag[]
  ts: number
  folderId: string
}

function loadSessionFiles(folderId: string): DriveFileWithEtag[] | null {
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(SESSION_FILES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SessionFilesCache
    if (parsed.folderId !== folderId) return null
    if (Date.now() - parsed.ts > SESSION_FILES_TTL) return null
    return parsed.files
  } catch { return null }
}

function saveSessionFiles(files: DriveFileWithEtag[], folderId: string): void {
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(SESSION_FILES_KEY, JSON.stringify({ files, ts: Date.now(), folderId }))
  } catch {}
}

function clearSessionFiles(): void {
  if (typeof sessionStorage === 'undefined') return
  try { sessionStorage.removeItem(SESSION_FILES_KEY) } catch {}
}

export interface ReadFileResult {
  content: string
  etag: string
  name?: string
  /** 오프라인 캐시에서 로드된 경우 true */
  fromCache?: boolean
}

export interface SaveResult {
  id: string
  name: string
  renamed: boolean
  etag: string
  parentId?: string
}

// ── env ──────────────────────────────────────────────────────────

function getClientId(): string {
  const id = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!id) {
    throw new Error(
      'NEXT_PUBLIC_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다 (.env.local 확인)'
    )
  }
  return id
}

function getRedirectUri(): string {
  // 우선순위: 환경변수 > 현재 origin + /auth/callback
  const env = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI
  if (env) return env
  if (typeof window === 'undefined') {
    throw new Error('redirect URI 를 서버에서 결정할 수 없습니다')
  }
  return `${window.location.origin}/auth/callback`
}

// ── PKCE helpers ─────────────────────────────────────────────────

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function generateCodeVerifier(): string {
  return base64urlEncode(
    crypto.getRandomValues(new Uint8Array(48)).buffer as ArrayBuffer
  )
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  if (!crypto?.subtle) {
    throw new Error(
      'SubtleCrypto API를 사용할 수 없습니다. HTTPS 또는 localhost에서 접근해주세요.'
    )
  }
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier)
  )
  return base64urlEncode(digest)
}

// ── token lifecycle ─────────────────────────────────────────────

export class CloudError extends Error {
  code: 'NETWORK' | 'UNAUTHORIZED' | 'NOT_FOUND' | 'PRECONDITION_FAILED' | 'UNKNOWN'
  httpStatus?: number
  retryable: boolean
  constructor(
    code: CloudError['code'],
    message: string,
    httpStatus?: number,
    retryable = false
  ) {
    super(message)
    this.code = code
    this.httpStatus = httpStatus
    this.retryable = retryable
  }
}

async function refreshAccessToken(
  refreshToken: string,
  _clientId: string
): Promise<TokenData> {
  const res = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CloudError(
      'UNAUTHORIZED',
      data.error_description ?? 'Token refresh failed',
      res.status
    )
  }
  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

async function getValidToken(): Promise<string> {
  const existing = loadToken()
  if (!existing) {
    throw new CloudError('UNAUTHORIZED', '로그인이 필요합니다')
  }
  if (isTokenFresh(existing)) {
    return existing.accessToken
  }
  if (!existing.refreshToken) {
    throw new CloudError('UNAUTHORIZED', '세션이 만료되었습니다. 다시 로그인해주세요')
  }
  const refreshed = await refreshAccessToken(existing.refreshToken, getClientId())
  saveToken(refreshed)
  return refreshed.accessToken
}

// ── OAuth entry points ──────────────────────────────────────────

/**
 * Google OAuth 시작 — 현재 탭을 Google 로그인 페이지로 redirect.
 * (PWA 는 Tauri invoke 불가 → popup 대신 full redirect flow 사용)
 */
export async function signIn(): Promise<never> {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  savePkceVerifier(verifier)

  // CSRF 방어 — OAuth state (Design §7 Security)
  const state = base64urlEncode(
    crypto.getRandomValues(new Uint8Array(24)).buffer as ArrayBuffer
  )
  saveOauthState(state)

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', getClientId())
  authUrl.searchParams.set('redirect_uri', getRedirectUri())
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', OAUTH_SCOPES.join(' '))
  authUrl.searchParams.set('code_challenge', challenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('state', state)
  // prompt=consent 로 refresh_token 보장 (최초 로그인 또는 scope 변경 시 필수)
  authUrl.searchParams.set('prompt', 'consent')

  window.location.assign(authUrl.toString())
  // 브라우저 navigation 으로 현재 스크립트는 종료
  return new Promise(() => {})
}

/**
 * /auth/callback 페이지에서 호출. URL 의 ?code 파라미터로 토큰 교환.
 * @param codeParam Google 에서 전달된 authorization code
 * @param stateParam Google 에서 되돌려준 state (CSRF 방어 — 저장된 값과 일치해야 함)
 */
export async function handleCallback(
  codeParam: string,
  stateParam: string | null
): Promise<StoredUser> {
  // CSRF 검증 — saved state 와 일치해야 진행
  const savedState = loadOauthState()
  if (!savedState || !stateParam || savedState !== stateParam) {
    clearOauthState()
    throw new CloudError(
      'UNAUTHORIZED',
      'OAuth state 검증 실패 (CSRF 의심) — 다시 로그인해주세요'
    )
  }
  clearOauthState()

  const verifier = loadPkceVerifier()
  if (!verifier) {
    throw new CloudError('UNAUTHORIZED', 'PKCE verifier 가 없습니다 (재로그인 필요)')
  }

  const tokenRes = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: codeParam,
      redirect_uri: getRedirectUri(),
      code_verifier: verifier,
    }),
  })
  const tokenData = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok) {
    throw new CloudError(
      'UNAUTHORIZED',
      tokenData.error_description ?? '토큰 교환 실패',
      tokenRes.status
    )
  }

  saveToken({
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: Date.now() + tokenData.expires_in * 1000,
  })
  clearPkceVerifier()

  const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  })
  if (!userRes.ok) {
    throw new CloudError('UNAUTHORIZED', '사용자 정보 조회 실패', userRes.status)
  }
  const info = await userRes.json()
  const user: StoredUser = {
    id: info.sub,
    name: info.name,
    email: info.email,
    picture: info.picture,
  }
  saveUser(user)

  // 로그인 직후 폴더 부트스트랩 (best effort — 실패해도 로그인 자체는 성공)
  ensureFolder().catch((err) => {
    console.warn('[cloud] ensureFolder failed:', err)
  })

  return user
}

export function getCurrentUser(): StoredUser | null {
  return loadUser()
}

export function isAuthenticated(): boolean {
  return Boolean(loadToken()) && Boolean(loadUser())
}

export async function signOut(): Promise<void> {
  const t = loadToken()
  if (t?.accessToken) {
    // revoke 는 best-effort
    fetch(
      `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(t.accessToken)}`,
      { method: 'POST' }
    ).catch(() => {})
  }
  clearAllCloudStorage()
  await clearCacheForLogout()
}

// ── Drive helpers ────────────────────────────────────────────────

function escapeQ(s: string): string {
  return s.replace(/'/g, "\\'")
}

async function driveFindFolderByName(
  token: string,
  name: string
): Promise<{ id: string } | null> {
  // 'root' in parents 필터는 drive.file scope에서 동작하지 않으므로 제외
  const q = `name='${escapeQ(name)}' and mimeType='${DRIVE_MIME.FOLDER}' and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    const detail = errBody?.error?.message ?? errBody?.error ?? '폴더 조회 실패'
    throw new CloudError(mapStatus(res.status), String(detail), res.status)
  }
  const data = await res.json()
  const files = data.files as Array<{ id: string }> | undefined
  return files && files.length > 0 ? { id: files[0].id } : null
}

async function driveVerifyFolder(token: string, folderId: string): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,trashed`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) return false
  const data = await res.json()
  return !data.trashed
}

async function driveCreateFolder(token: string, name: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, mimeType: DRIVE_MIME.FOLDER }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CloudError(
      mapStatus(res.status),
      data?.error?.message ?? '폴더 생성 실패',
      res.status
    )
  }
  return data.id as string
}

async function driveRenameFile(
  token: string,
  fileId: string,
  newName: string
): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newName }),
    }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new CloudError(
      mapStatus(res.status),
      data?.error?.message ?? 'Rename 실패',
      res.status
    )
  }
}

async function driveListNamesInFolder(
  token: string,
  folderId: string
): Promise<string[]> {
  const q = `'${folderId}' in parents and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(name)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new CloudError(mapStatus(res.status), '목록 조회 실패', res.status)
  }
  const data = await res.json()
  return (
    (data.files as Array<{ name: string }> | undefined)?.map((f) => f.name) ??
    []
  )
}

interface DriveItemRaw {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  headRevisionId?: string
}

async function driveListFolderContents(token: string, folderId: string): Promise<DriveItemRaw[]> {
  const q = `'${folderId}' in parents and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,headRevisionId)&orderBy=modifiedTime desc`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    throw new CloudError(mapStatus(res.status), '목록 조회 실패', res.status)
  }
  const data = await res.json()
  return (data.files ?? []) as DriveItemRaw[]
}

function mapStatus(status: number): CloudError['code'] {
  if (status === 401) return 'UNAUTHORIZED'
  if (status === 404) return 'NOT_FOUND'
  if (status === 412) return 'PRECONDITION_FAILED'
  if (status >= 500) return 'UNKNOWN'
  return 'UNKNOWN'
}

/**
 * 'Simple Note' 폴더를 확보한다. 레거시 'Note App' 이 있으면
 * Tauri 와 달리 PWA 에서는 **자동 rename** (확인 다이얼로그 생략 — 사용자가
 * 이미 데스크탑에서 마이그레이션했거나 처음부터 'Simple Note' 를 쓰는 케이스).
 * 필요 시 §2.2 Flow C 에 따라 추후 확인 토스트 추가 가능.
 */

// 동시 다중 호출로 인한 폴더 중복 생성 방지 — 진행 중인 Promise를 공유한다
let _ensureFolderInFlight: Promise<string> | null = null

export function ensureFolder(): Promise<string> {
  if (_ensureFolderInFlight) return _ensureFolderInFlight

  _ensureFolderInFlight = _verifyAndEnsureFolder().finally(() => {
    _ensureFolderInFlight = null
  })
  return _ensureFolderInFlight
}

async function _verifyAndEnsureFolder(): Promise<string> {
  const cached = loadFolder()
  if (cached) {
    const token = await getValidToken()
    const ok = await driveVerifyFolder(token, cached.folderId)
    if (ok) return cached.folderId
    // 캐시된 폴더가 삭제됐거나 drive.file 접근 불가 → 재생성
  }
  return _doEnsureFolder()
}

async function _doEnsureFolder(): Promise<string> {
  const token = await getValidToken()
  const plan = await planFolderMigration({
    findFolderByName: async (name) => driveFindFolderByName(token, name),
  })

  if (plan.action === 'rename' && plan.legacyFolderId) {
    await driveRenameFile(token, plan.legacyFolderId, SIMPLE_NOTE_FOLDER_NAME)
    saveFolder({
      folderId: plan.legacyFolderId,
      folderName: SIMPLE_NOTE_FOLDER_NAME,
    })
    return plan.legacyFolderId
  }

  if (plan.currentFolderId) {
    saveFolder({ folderId: plan.currentFolderId, folderName: SIMPLE_NOTE_FOLDER_NAME })
    return plan.currentFolderId
  }

  const created = await driveCreateFolder(token, SIMPLE_NOTE_FOLDER_NAME)
  saveFolder({ folderId: created, folderName: SIMPLE_NOTE_FOLDER_NAME })
  return created
}

// ── File operations ─────────────────────────────────────────────

/**
 * 파일 목록 조회. 성공 시 메타데이터 캐시 저장. 오프라인/실패 시 캐시에서 폴백.
 * 반환 타입은 `etag` 를 포함한 확장본.
 */
export async function listFiles(): Promise<DriveFileWithEtag[]> {
  const folderId = await ensureFolderOrCached()

  // sessionStorage 캐시 히트 (TTL 5분) — 네트워크 불필요
  const sessionHit = loadSessionFiles(folderId)
  if (sessionHit) return sessionHit

  // 오프라인 또는 네트워크 실패 → IndexedDB 캐시
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return loadCachedList(folderId)
  }

  try {
    const token = await getValidToken()
    const rootItems = await driveListFolderContents(token, folderId)
    const folderItems = rootItems.filter((i) => i.mimeType === DRIVE_MIME.FOLDER)
    const rootFileItems = rootItems.filter((i) => i.mimeType !== DRIVE_MIME.FOLDER)

    // Fetch all subfolder contents in parallel (1 level deep)
    const subItemsArrays = await Promise.all(
      folderItems.map((f) => driveListFolderContents(token, f.id).catch(() => [] as DriveItemRaw[]))
    )

    const result: DriveFileWithEtag[] = []
    for (const f of folderItems) {
      result.push({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, etag: '' })
    }
    for (const f of rootFileItems) {
      result.push({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, etag: f.headRevisionId ?? '' })
    }
    for (let i = 0; i < folderItems.length; i++) {
      for (const f of subItemsArrays[i]) {
        if (f.mimeType !== DRIVE_MIME.FOLDER) {
          result.push({ id: f.id, name: f.name, mimeType: f.mimeType, modifiedTime: f.modifiedTime, etag: f.headRevisionId ?? '', parentId: folderItems[i].id })
        }
      }
    }

    saveSessionFiles(result, folderId)
    const filesOnly = result.filter((f) => f.mimeType !== DRIVE_MIME.FOLDER)
    await saveMetadataList(filesOnly, folderId, (f) =>
      (f as DriveFileWithEtag).etag
    ).catch(() => {})
    return result
  } catch (e) {
    if (e instanceof CloudError && e.code === 'UNAUTHORIZED') throw e
    // 네트워크 실패 추정 → 캐시 폴백
    const cached = await loadCachedList(folderId)
    if (cached.length > 0) return cached
    throw e
  }
}

async function loadCachedList(folderId: string): Promise<DriveFileWithEtag[]> {
  const list = await loadMetadataList(folderId)
  return list
    .sort((a, b) => (a.modifiedTime < b.modifiedTime ? 1 : -1))
    .map((m) => ({
      id: m.fileId,
      name: m.name,
      mimeType: m.mimeType,
      modifiedTime: m.modifiedTime,
      etag: m.etag,
    }))
}

/**
 * folder ID 를 네트워크 없이도 얻기 위한 헬퍼.
 * - 캐시 있으면 즉시 반환
 * - 아니면 ensureFolder() (네트워크 필요)
 */
async function ensureFolderOrCached(): Promise<string> {
  const cached = loadFolder()
  if (cached) return cached.folderId
  return ensureFolder()
}

/**
 * 파일 본문 읽기. 온라인 시 Drive 에서 읽고 본문+etag 캐싱.
 * 오프라인 시 캐시에서 로드.
 */
export async function readFile(fileId: string): Promise<ReadFileResult> {
  // sessionStorage 캐시 히트 (TTL 3분) — 네트워크 불필요
  const sessionHit = loadSessionContent(fileId)
  if (sessionHit) return sessionHit

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = await loadContent(fileId)
    if (cached) {
      await touchLastAccess(fileId).catch(() => {})
      return { content: cached.content, etag: cached.baseEtag, fromCache: true }
    }
    throw new CloudError('NETWORK', '오프라인이며 캐시에 없습니다')
  }

  try {
    const token = await getValidToken()
    // content + etag 를 한 번에 얻기 위해 병렬 호출
    const [bodyRes, metaRes] = await Promise.all([
      fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
      fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?fields=headRevisionId,name`,
        { headers: { Authorization: `Bearer ${token}` } }
      ),
    ])
    if (!bodyRes.ok) {
      throw new CloudError(
        mapStatus(bodyRes.status),
        '파일 읽기 실패',
        bodyRes.status
      )
    }
    const content = await bodyRes.text()
    const meta = metaRes.ok ? await metaRes.json() : {}
    const etag = (meta?.headRevisionId as string | undefined) ?? ''
    const name = (meta?.name as string | undefined) || undefined
    const result: ReadFileResult = { content, etag, name }
    saveSessionContent(fileId, result)
    await cacheSaveContent(fileId, content, etag).catch(() => {})
    return result
  } catch (e) {
    if (e instanceof CloudError && e.code === 'UNAUTHORIZED') throw e
    // 네트워크 실패 → 캐시 폴백
    const cached = await loadContent(fileId)
    if (cached) {
      return { content: cached.content, etag: cached.baseEtag, fromCache: true }
    }
    throw e
  }
}

/**
 * 서버의 metadata(name, modifiedTime, headRevisionId) 만 조회.
 * 동기화 시 etag 비교용.
 */
export async function fetchMetadata(fileId: string): Promise<{
  id: string
  name: string
  modifiedTime: string
  etag: string
} | null> {
  try {
    const token = await getValidToken()
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,modifiedTime,headRevisionId`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) {
      if (res.status === 404) return null
      throw new CloudError(mapStatus(res.status), 'metadata 조회 실패', res.status)
    }
    const d = await res.json()
    return {
      id: d.id,
      name: d.name,
      modifiedTime: d.modifiedTime,
      etag: d.headRevisionId ?? '',
    }
  } catch (e) {
    if (e instanceof CloudError) throw e
    throw new CloudError('NETWORK', 'metadata 조회 실패 (네트워크)')
  }
}

/**
 * 파일 저장:
 * - fileId 있으면 내용만 갱신 (이름 변경 없음)
 * - fileId 없으면 신규 생성 — 폴더 내 동일 이름 있으면 FR-30 에 따라 '(2)' suffix
 * 성공 시 로컬 본문 캐시와 metadata 캐시도 갱신.
 */
export async function saveFile(
  name: string,
  content: string,
  fileId?: string,
  parentFolderId?: string
): Promise<SaveResult> {
  const token = await getValidToken()
  const mimeType =
    name.endsWith('.md') || name.endsWith('.markdown')
      ? DRIVE_MIME.MD
      : DRIVE_MIME.TXT

  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,name,modifiedTime,headRevisionId`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': mimeType,
        },
        body: content,
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new CloudError(
        mapStatus(res.status),
        data?.error?.message ?? '저장 실패',
        res.status
      )
    }
    const etag = (data.headRevisionId as string | undefined) ?? ''
    await cacheSaveContent(fileId, content, etag).catch(() => {})
    clearSessionFiles()
    clearSessionContent(fileId)
    return { id: data.id, name: data.name ?? name, renamed: false, etag }
  }

  const targetFolder = parentFolderId ?? await ensureFolder()
  const existingNames = await driveListNamesInFolder(token, targetFolder)
  const { name: finalName, renamed } = resolveUniqueName(name, existingNames)

  const metadata = { name: finalName, mimeType, parents: [targetFolder] }
  const form = new FormData()
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  )
  form.append('file', new Blob([content], { type: mimeType }))

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,headRevisionId',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CloudError(
      mapStatus(res.status),
      data?.error?.message ?? '업로드 실패',
      res.status
    )
  }
  const etag = (data.headRevisionId as string | undefined) ?? ''
  await cacheSaveContent(data.id, content, etag).catch(() => {})
  clearSessionFiles()
  return { id: data.id, name: finalName, renamed, etag, parentId: parentFolderId }
}

/**
 * 캐시된 파일 목록 즉시 반환 (stale-while-revalidate 용).
 * 네트워크 불필요, 오프라인에서도 사용 가능.
 */
export async function getCachedFilesList(): Promise<DriveFileWithEtag[]> {
  const folder = loadFolder()
  if (!folder) return []
  const sessionHit = loadSessionFiles(folder.folderId)
  if (sessionHit) return sessionHit
  return loadCachedList(folder.folderId).catch(() => [])
}

/**
 * 캐시된 fileId 집합 (UI 에서 미캐시 파일 🔒 표시용).
 * IndexedDB 미지원 환경에서는 빈 Set.
 */
export async function getCachedFileIds(): Promise<Set<string>> {
  try {
    return await cachedFileIds()
  } catch {
    return new Set()
  }
}

/** logout 전 전체 캐시 정리 */
export async function clearCacheForLogout(): Promise<void> {
  try {
    await clearAllCache()
  } catch {
    /* ignore */
  }
}

export async function createUserFolder(name: string): Promise<DriveFile> {
  const token = await getValidToken()
  const rootFolderId = await ensureFolder()
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, mimeType: DRIVE_MIME.FOLDER, parents: [rootFolderId] }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new CloudError(mapStatus(res.status), data?.error?.message ?? '폴더 생성 실패', res.status)
  }
  clearSessionFiles()
  return {
    id: data.id as string,
    name: (data.name as string) ?? name,
    mimeType: DRIVE_MIME.FOLDER,
    modifiedTime: new Date().toISOString(),
  }
}

export function getRootFolderId(): string | null {
  return loadFolder()?.folderId ?? null
}

export async function moveFile(fileId: string, newParentId: string, oldParentId?: string): Promise<void> {
  const token = await getValidToken()
  const effectiveOldParentId = oldParentId ?? await ensureFolder()
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(newParentId)}&removeParents=${encodeURIComponent(effectiveOldParentId)}&fields=id`,
    { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new CloudError(mapStatus(res.status), data?.error?.message ?? '이동 실패', res.status)
  }
  clearSessionFiles()
}

export async function renameFile(fileId: string, newName: string): Promise<void> {
  const token = await getValidToken()
  await driveRenameFile(token, fileId, newName)
  clearSessionFiles()
}

export interface DriveFolder {
  id: string
  name: string
}

export async function listFolders(): Promise<DriveFolder[]> {
  const token = await getValidToken()
  const q = `mimeType='application/vnd.google-apps.folder' and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&orderBy=name&pageSize=100`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok) throw new CloudError(mapStatus(res.status), '폴더 목록 조회 실패', res.status)
  const data = await res.json()
  return (data.files ?? []) as DriveFolder[]
}

export async function moveFileToFolder(fileId: string, newFolderId: string): Promise<void> {
  const token = await getValidToken()
  const folder = loadFolder()
  const params = new URLSearchParams({ fields: 'id', addParents: newFolderId })
  if (folder?.folderId) params.set('removeParents', folder.folderId)
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?${params}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    }
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new CloudError(mapStatus(res.status), data?.error?.message ?? '이동 실패', res.status)
  }
  clearSessionFiles()
}

export async function deleteFile(fileId: string): Promise<void> {
  const token = await getValidToken()
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
  if (!res.ok && res.status !== 404) {
    throw new CloudError(mapStatus(res.status), '삭제 실패', res.status)
  }
  clearSessionFiles()
  clearSessionContent(fileId)
  await removeMetadata(fileId).catch(() => {})
}
