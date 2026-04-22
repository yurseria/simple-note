// Design Ref: §5.3 Component List — PWA 자체 state (renderer/store 사용 불가, 경계 §9.3)
// Plan SC: FR-11 (목록 상태), FR-04 (files 데이터)

import { create } from 'zustand'
import type { DriveFile } from '@simple-note/renderer/types/api'
import type { StoredUser } from './token'

interface CloudState {
  user: StoredUser | null
  files: DriveFile[]
  loading: boolean
  error: string | null
  online: boolean
  setUser: (u: StoredUser | null) => void
  setFiles: (f: DriveFile[]) => void
  setLoading: (b: boolean) => void
  setError: (e: string | null) => void
  setOnline: (b: boolean) => void
  /** 한 파일만 갱신 (저장 후 목록 최신화) */
  upsertFile: (f: DriveFile) => void
  /** 파일 제거 */
  removeFile: (fileId: string) => void
  reset: () => void
}

export const useCloudState = create<CloudState>((set) => ({
  user: null,
  files: [],
  loading: false,
  error: null,
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  setUser: (user) => set({ user }),
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setOnline: (online) => set({ online }),
  upsertFile: (f) =>
    set((s) => {
      const idx = s.files.findIndex((x) => x.id === f.id)
      if (idx < 0) return { files: [f, ...s.files] }
      const next = s.files.slice()
      next[idx] = f
      return { files: next }
    }),
  removeFile: (fileId) =>
    set((s) => ({ files: s.files.filter((f) => f.id !== fileId) })),
  reset: () =>
    set({
      user: null,
      files: [],
      loading: false,
      error: null,
    }),
}))
