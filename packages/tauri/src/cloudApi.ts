// Design Ref: §2.2 Flow C, §4.1 Drive API, §7.4 Drive 저장 구조
// Plan SC: FR-26 (폴더 부트스트랩), FR-27 (flat 구조), FR-28 (drive.file scope),
//          FR-29 (H1 자동 파일명), FR-30 (중복 자동 suffix), FR-31 (rename 중복 차단)

import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ask } from '@tauri-apps/plugin-dialog'
import type { CloudAPI, CloudUser, DriveFile } from '@simple-note/renderer/types/api'
import {
  DRIVE_MIME,
  OAUTH_SCOPES,
  SIMPLE_NOTE_FOLDER_NAME,
} from '@simple-note/renderer/domain/driveFolder'
import { planFolderMigration } from '@simple-note/renderer/domain/migration'
import { resolveUniqueName } from '@simple-note/renderer/domain/filename'

function base64urlEncode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function generateCodeVerifier(): string {
  return base64urlEncode(crypto.getRandomValues(new Uint8Array(48)).buffer as ArrayBuffer)
}
async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64urlEncode(digest)
}

const SCOPES = OAUTH_SCOPES.join(' ')

interface TokenData {
  access_token: string
  refresh_token?: string
  expires_at: number
}

let _tokenData: TokenData | null = null
let _user: CloudUser | null = null
/** 해결된 'Simple Note' 폴더 ID 캐시 */
let _folderId: string | null = null

const TOKEN_KEY = 'cloud.token'
const USER_KEY = 'cloud.user'

async function loadPersisted() {
  try {
    const { getStore } = await import('@tauri-apps/plugin-store')
    const store = await getStore('settings.json')
    const token = await store?.get<TokenData>(TOKEN_KEY)
    const user = await store?.get<CloudUser>(USER_KEY)
    if (token) _tokenData = token
    if (user) _user = user
  } catch {
    // store not available
  }
}

async function persist() {
  try {
    const { getStore } = await import('@tauri-apps/plugin-store')
    const store = await getStore('settings.json')
    if (!store) return
    if (_tokenData) {
      await store.set(TOKEN_KEY, _tokenData)
    } else {
      await store.delete(TOKEN_KEY)
    }
    if (_user) {
      await store.set(USER_KEY, _user)
    } else {
      await store.delete(USER_KEY)
    }
    await store.save()
  } catch {
    // ignore
  }
}

async function getValidToken(clientId: string): Promise<string> {
  if (!_tokenData) throw new Error('Not logged in')

  if (Date.now() < _tokenData.expires_at - 60_000) {
    return _tokenData.access_token
  }

  if (!_tokenData.refresh_token) throw new Error('Session expired, please log in again')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      refresh_token: _tokenData.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? 'Token refresh failed')

  _tokenData = {
    access_token: data.access_token,
    refresh_token: _tokenData.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  }
  await persist()
  return _tokenData.access_token
}

// ── Drive helpers ──────────────────────────────────────────────────

async function driveFindFolderByName(
  token: string,
  name: string
): Promise<{ id: string } | null> {
  const q = `name='${escapeQ(name)}' and mimeType='${DRIVE_MIME.FOLDER}' and 'root' in parents and trashed=false`
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  const files = data.files as Array<{ id: string }> | undefined
  return files && files.length > 0 ? { id: files[0].id } : null
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
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Failed to create folder')
  }
  return data.id
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
    throw new Error(data?.error?.message ?? 'Failed to rename')
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
  const data = await res.json()
  const files = (data.files as Array<{ name: string }> | undefined) ?? []
  return files.map((f) => f.name)
}

function escapeQ(s: string): string {
  return s.replace(/'/g, "\\'")
}

/**
 * 'Simple Note' 폴더를 확보한다.
 * - 이미 있으면 그대로 사용
 * - 레거시 'Note App' 폴더만 있으면 사용자에게 확인 후 rename (계획: FR-26)
 * - 아무것도 없으면 새로 생성
 *
 * 결과는 모듈 내 `_folderId` 에 캐시된다.
 */
async function ensureDriveFolder(token: string): Promise<string> {
  if (_folderId) return _folderId

  const plan = await planFolderMigration({
    findFolderByName: async (name) => driveFindFolderByName(token, name),
  })

  if (plan.action === 'rename' && plan.legacyFolderId && plan.legacyName) {
    const confirmed = await ask(
      `기존 '${plan.legacyName}' 폴더를 '${SIMPLE_NOTE_FOLDER_NAME}' 로 변경합니다.\n` +
        '폴더 내부 파일은 그대로 유지됩니다. 진행할까요?',
      { title: '폴더 마이그레이션', kind: 'info', okLabel: '변경', cancelLabel: '취소' }
    )
    if (confirmed) {
      await driveRenameFile(token, plan.legacyFolderId, SIMPLE_NOTE_FOLDER_NAME)
      _folderId = plan.legacyFolderId
      return _folderId
    }
    // 사용자가 거부: fallthrough 해서 새 폴더 생성
  }

  // 재확인: 동시에 다른 기기에서 만들었을 수도 있음
  const existing = await driveFindFolderByName(token, SIMPLE_NOTE_FOLDER_NAME)
  if (existing) {
    _folderId = existing.id
    return _folderId
  }

  _folderId = await driveCreateFolder(token, SIMPLE_NOTE_FOLDER_NAME)
  return _folderId
}

// ── Public API ─────────────────────────────────────────────────────

export function buildTauriCloudAPI(clientId: string): CloudAPI {
  loadPersisted()

  return {
    isAvailable: () => Boolean(clientId),

    getUser: () => _user,

    login: async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)

      const port: number = await invoke('cloud_start_auth_server')
      const redirectUri = `http://127.0.0.1:${port}`

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', SCOPES)
      authUrl.searchParams.set('code_challenge', challenge)
      authUrl.searchParams.set('code_challenge_method', 'S256')
      authUrl.searchParams.set('access_type', 'offline')
      authUrl.searchParams.set('prompt', 'consent')

      await invoke('open_external_url', { url: authUrl.toString() })

      const query: string = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Login timed out')), 120_000)
        listen<string>('cloud:auth-callback', (event) => {
          clearTimeout(timeout)
          resolve(event.payload)
        })
      })

      const params = new URLSearchParams(query)
      const code = params.get('code')
      if (!code) throw new Error(params.get('error') ?? 'No auth code received')

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: verifier,
          grant_type: 'authorization_code',
        }),
      })
      const tokenData = await tokenRes.json()
      if (!tokenRes.ok) throw new Error(tokenData.error_description ?? 'Token exchange failed')

      _tokenData = {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: Date.now() + tokenData.expires_in * 1000,
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${_tokenData.access_token}` },
      })
      const userInfo = await userRes.json()
      _user = { id: userInfo.sub, name: userInfo.name, email: userInfo.email, picture: userInfo.picture }

      await persist()

      // 로그인 직후 폴더 부트스트랩 (마이그레이션 포함). 실패해도 로그인 자체는 성공으로 처리.
      ensureDriveFolder(_tokenData.access_token).catch((err) => {
        console.warn('[cloud] ensureDriveFolder failed:', err)
      })

      return _user
    },

    logout: async () => {
      if (_tokenData?.access_token) {
        fetch(`https://oauth2.googleapis.com/revoke?token=${_tokenData.access_token}`, { method: 'POST' }).catch(() => {})
      }
      _tokenData = null
      _user = null
      _folderId = null
      await persist()
    },

    listFiles: async () => {
      const token = await getValidToken(clientId)
      const folderId = await ensureDriveFolder(token)
      const q = `'${folderId}' in parents and trashed=false`
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      return (data.files as DriveFile[]) ?? []
    },

    readFile: async (fileId: string) => {
      const token = await getValidToken(clientId)
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return res.text()
    },

    saveFile: async (name: string, content: string, fileId?: string) => {
      const token = await getValidToken(clientId)
      const mimeType =
        name.endsWith('.md') || name.endsWith('.markdown')
          ? DRIVE_MIME.MD
          : DRIVE_MIME.TXT

      if (fileId) {
        // 기존 파일 업데이트 — 이름은 건드리지 않음 (rename은 별도 API 호출)
        const res = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
            body: content,
          }
        )
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error?.message ?? 'Failed to update file')
        }
        return data.id
      }

      // 신규 업로드: 폴더 내 동일 이름이 있으면 FR-30 에 따라 자동 suffix
      const folderId = await ensureDriveFolder(token)
      const existingNames = await driveListNamesInFolder(token, folderId)
      const { name: finalName } = resolveUniqueName(name, existingNames)

      const metadata = { name: finalName, mimeType, parents: [folderId] }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([content], { type: mimeType }))

      const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error?.message ?? 'Failed to upload file')
      }
      return data.id
    },

    deleteFile: async (fileId: string) => {
      const token = await getValidToken(clientId)
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    },
  }
}
