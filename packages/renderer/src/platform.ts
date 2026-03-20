import type { NoteAPI } from './types/api'

const _holder: { impl: NoteAPI | null } = { impl: null }

/**
 * Proxy-based API singleton.
 * 호출 패턴: api.file.open(), api.settings.get() 등
 */
export const api = new Proxy({} as NoteAPI, {
  get(_target, prop: string) {
    if (!_holder.impl) throw new Error('Platform API not initialized. Call setPlatformApi() first.')
    return _holder.impl[prop as keyof NoteAPI]
  }
})

export function setPlatformApi(impl: NoteAPI): void {
  _holder.impl = impl
}
