// Design Ref: §8.2 L1 Domain Unit Tests — cases 14-15
import { describe, it, expect, vi } from 'vitest'
import { planFolderMigration } from './migration'

describe('planFolderMigration', () => {
  it('case 14: returns action=none when Simple Note already exists', async () => {
    const findFolderByName = vi.fn(async (name: string) =>
      name === 'Simple Note' ? { id: 'sn-id' } : null
    )
    const plan = await planFolderMigration({ findFolderByName })
    expect(plan).toEqual({ action: 'none', targetName: 'Simple Note' })
    // Simple Note 존재 시 레거시 조회는 하지 않아야 함 (최적화)
    expect(findFolderByName).toHaveBeenCalledTimes(1)
  })

  it('case 15: returns action=rename when only Note App exists', async () => {
    const findFolderByName = vi.fn(async (name: string) =>
      name === 'Note App' ? { id: 'legacy-id' } : null
    )
    const plan = await planFolderMigration({ findFolderByName })
    expect(plan).toEqual({
      action: 'rename',
      legacyFolderId: 'legacy-id',
      legacyName: 'Note App',
      targetName: 'Simple Note',
    })
  })

  it('returns action=none when neither Simple Note nor legacy exists', async () => {
    const findFolderByName = vi.fn(async () => null)
    const plan = await planFolderMigration({ findFolderByName })
    expect(plan).toEqual({ action: 'none', targetName: 'Simple Note' })
  })

  it('prefers Simple Note over legacy even if both exist', async () => {
    // 현실적으로 두 폴더가 공존할 수 있음 — 사용자가 수동 복제/이동한 경우
    // 정책: Simple Note 를 우선 사용, 레거시는 사용자가 직접 정리
    const findFolderByName = vi.fn(async (name: string) => {
      if (name === 'Simple Note') return { id: 'new-id' }
      if (name === 'Note App') return { id: 'legacy-id' }
      return null
    })
    const plan = await planFolderMigration({ findFolderByName })
    expect(plan.action).toBe('none')
    expect(plan.targetName).toBe('Simple Note')
  })
})
