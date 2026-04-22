// Design Ref: §3.3 IndexedDB Schema — simple-note-cache v1
// Plan SC: FR-18 (메타데이터 캐시), FR-19 (본문 LRU 캐시 N=20), FR-22 (pending_edits)

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DriveFile } from '@simple-note/renderer/types/api'

export const LRU_LIMIT = 20

export interface FileMetadataEntry {
  fileId: string
  name: string
  mimeType: string
  modifiedTime: string
  etag: string
  folderId: string
  cachedAt: number
}

export interface FileContentEntry {
  fileId: string
  content: string
  baseEtag: string
  cachedAt: number
  lastAccessAt: number
}

export type SyncStatus = 'pending' | 'syncing' | 'conflict'

export interface PendingEditEntry {
  fileId: string // 'new:<uuid>' for newly created files offline
  localContent: string
  baseEtag: string
  /** 신규 파일인 경우 저장 시 사용할 이름 (H1 도출 결과 등) */
  pendingName?: string
  editedAt: number
  status: SyncStatus
  retries?: number
  lastError?: string
}

interface SchemaV1 extends DBSchema {
  file_metadata: {
    key: string
    value: FileMetadataEntry
    indexes: { 'by-folderId': string }
  }
  file_content: {
    key: string
    value: FileContentEntry
    indexes: { 'by-lastAccessAt': number }
  }
  pending_edits: {
    key: string
    value: PendingEditEntry
    indexes: { 'by-status': SyncStatus }
  }
  kv: {
    key: string
    value: unknown
  }
}

const DB_NAME = 'simple-note-cache'
const DB_VERSION = 1

let _db: Promise<IDBPDatabase<SchemaV1>> | null = null

function getDB(): Promise<IDBPDatabase<SchemaV1>> {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available in this environment'))
  }
  if (_db) return _db
  _db = openDB<SchemaV1>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('file_metadata')) {
        const s = db.createObjectStore('file_metadata', { keyPath: 'fileId' })
        s.createIndex('by-folderId', 'folderId')
      }
      if (!db.objectStoreNames.contains('file_content')) {
        const s = db.createObjectStore('file_content', { keyPath: 'fileId' })
        s.createIndex('by-lastAccessAt', 'lastAccessAt')
      }
      if (!db.objectStoreNames.contains('pending_edits')) {
        const s = db.createObjectStore('pending_edits', { keyPath: 'fileId' })
        s.createIndex('by-status', 'status')
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv')
      }
    },
  })
  return _db
}

// ── file_metadata ─────────────────────────────────────────────

export async function saveMetadataList(
  files: DriveFile[],
  folderId: string,
  etagResolver?: (file: DriveFile) => string
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('file_metadata', 'readwrite')
  const now = Date.now()
  await Promise.all(
    files.map((f) =>
      tx.store.put({
        fileId: f.id,
        name: f.name,
        mimeType: f.mimeType,
        modifiedTime: f.modifiedTime,
        etag: etagResolver?.(f) ?? '',
        folderId,
        cachedAt: now,
      })
    )
  )
  await tx.done
}

export async function loadMetadataList(
  folderId: string
): Promise<FileMetadataEntry[]> {
  const db = await getDB()
  return db.getAllFromIndex('file_metadata', 'by-folderId', folderId)
}

export async function removeMetadata(fileId: string): Promise<void> {
  const db = await getDB()
  await db.delete('file_metadata', fileId)
}

// ── file_content (LRU) ────────────────────────────────────────

export async function saveContent(
  fileId: string,
  content: string,
  baseEtag: string
): Promise<void> {
  const db = await getDB()
  const now = Date.now()
  await db.put('file_content', {
    fileId,
    content,
    baseEtag,
    cachedAt: now,
    lastAccessAt: now,
  })
  await evictLRU(db)
}

export async function loadContent(
  fileId: string
): Promise<FileContentEntry | undefined> {
  const db = await getDB()
  return db.get('file_content', fileId)
}

export async function touchLastAccess(fileId: string): Promise<void> {
  const db = await getDB()
  const entry = await db.get('file_content', fileId)
  if (!entry) return
  entry.lastAccessAt = Date.now()
  await db.put('file_content', entry)
}

export async function cachedFileIds(): Promise<Set<string>> {
  const db = await getDB()
  const keys = (await db.getAllKeys('file_content')) as string[]
  return new Set(keys)
}

async function evictLRU(db: IDBPDatabase<SchemaV1>): Promise<void> {
  const count = await db.count('file_content')
  if (count <= LRU_LIMIT) return
  // index 정렬 (오래된 것부터) 후 초과분 삭제
  const tx = db.transaction('file_content', 'readwrite')
  const idx = tx.store.index('by-lastAccessAt')
  let cursor = await idx.openCursor()
  const toDelete: string[] = []
  const over = count - LRU_LIMIT
  while (cursor && toDelete.length < over) {
    toDelete.push(cursor.value.fileId)
    cursor = await cursor.continue()
  }
  await Promise.all(toDelete.map((id) => tx.store.delete(id)))
  await tx.done
}

// ── pending_edits ─────────────────────────────────────────────

export async function putPendingEdit(
  edit: PendingEditEntry
): Promise<void> {
  const db = await getDB()
  await db.put('pending_edits', edit)
}

export async function getPendingEdit(
  fileId: string
): Promise<PendingEditEntry | undefined> {
  const db = await getDB()
  return db.get('pending_edits', fileId)
}

export async function listPendingEdits(): Promise<PendingEditEntry[]> {
  const db = await getDB()
  return db.getAll('pending_edits')
}

export async function removePendingEdit(fileId: string): Promise<void> {
  const db = await getDB()
  await db.delete('pending_edits', fileId)
}

// ── kv ────────────────────────────────────────────────────────

export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await getDB()
  return (await db.get('kv', key)) as T | undefined
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const db = await getDB()
  await db.put('kv', value as unknown, key)
}

export async function kvDelete(key: string): Promise<void> {
  const db = await getDB()
  await db.delete('kv', key)
}

// ── Global reset (logout) ────────────────────────────────────

export async function clearAllCache(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('file_metadata'),
    db.clear('file_content'),
    db.clear('pending_edits'),
    db.clear('kv'),
  ])
}
