import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type { CloudAPI, CloudUser, DriveFile } from '@simple-note/renderer/types/api'

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

const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

const DRIVE_FOLDER_NAME = 'Note App'
const MIME_MD = 'text/markdown'
const MIME_TXT = 'text/plain'
const MIME_FOLDER = 'application/vnd.google-apps.folder'

interface TokenData {
  access_token: string
  refresh_token?: string
  expires_at: number
}

let _tokenData: TokenData | null = null
let _user: CloudUser | null = null

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

async function ensureDriveFolder(token: string): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${DRIVE_FOLDER_NAME}' and mimeType='${MIME_FOLDER}' and trashed=false&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  if (data.files?.length > 0) return data.files[0].id

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: DRIVE_FOLDER_NAME, mimeType: MIME_FOLDER }),
  })
  const folder = await createRes.json()
  return folder.id
}

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
      return _user
    },

    logout: async () => {
      if (_tokenData?.access_token) {
        fetch(`https://oauth2.googleapis.com/revoke?token=${_tokenData.access_token}`, { method: 'POST' }).catch(() => {})
      }
      _tokenData = null
      _user = null
      await persist()
    },

    listFiles: async () => {
      const token = await getValidToken(clientId)
      const folderId = await ensureDriveFolder(token)
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,modifiedTime)&orderBy=modifiedTime desc`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await res.json()
      return data.files ?? []
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
      const mimeType = name.endsWith('.md') || name.endsWith('.markdown') ? MIME_MD : MIME_TXT

      if (fileId) {
        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': mimeType },
          body: content,
        })
        const data = await res.json()
        return data.id
      }

      const folderId = await ensureDriveFolder(token)
      const metadata = { name, mimeType, parents: [folderId] }
      const form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([content], { type: mimeType }))

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      const data = await res.json()
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
