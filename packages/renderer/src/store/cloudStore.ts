import { create } from 'zustand'
import type { CloudUser, DriveFile } from '../types/api'

interface CloudState {
  user: CloudUser | null
  files: DriveFile[]
  loading: boolean
  error: string | null
  setUser(user: CloudUser | null): void
  setFiles(files: DriveFile[]): void
  setLoading(loading: boolean): void
  setError(error: string | null): void
}

export const useCloudStore = create<CloudState>((set) => ({
  user: null,
  files: [],
  loading: false,
  error: null,
  setUser: (user) => set({ user }),
  setFiles: (files) => set({ files }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))
