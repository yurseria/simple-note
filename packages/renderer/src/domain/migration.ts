// Design Ref: §2.2 Flow C — folder migration planner
// Plan SC: FR-26 (폴더 부트스트랩), 기존 'Note App' 호환

import { SIMPLE_NOTE_FOLDER_NAME, LEGACY_FOLDER_NAMES } from './driveFolder'

export type MigrationAction = 'none' | 'rename'

export interface MigrationPlan {
  action: MigrationAction
  /** 'none' 액션이고 폴더가 이미 존재할 때 해당 폴더 ID */
  currentFolderId?: string
  /** 'rename' 액션 대상 폴더 ID */
  legacyFolderId?: string
  /** 'rename' 액션 대상 폴더의 현재 이름 */
  legacyName?: string
  /** 마이그레이션 후 이름 (항상 SIMPLE_NOTE_FOLDER_NAME) */
  targetName: typeof SIMPLE_NOTE_FOLDER_NAME
}

export interface FolderLookup {
  findFolderByName: (name: string) => Promise<{ id: string } | null>
}

/**
 * Drive 에 이미 `Simple Note` 폴더가 있으면 action=none.
 * 없고 레거시(`Note App`) 폴더가 있으면 action=rename.
 * 둘 다 없으면 action=none (호출자가 새 폴더 생성).
 *
 * 이 함수는 계획만 반환한다 — 실제 rename/create 는 infrastructure 계층에서 수행.
 */
export async function planFolderMigration(
  ctx: FolderLookup
): Promise<MigrationPlan> {
  // 1) 이미 Simple Note 있으면 그대로
  const current = await ctx.findFolderByName(SIMPLE_NOTE_FOLDER_NAME)
  if (current) {
    return { action: 'none', currentFolderId: current.id, targetName: SIMPLE_NOTE_FOLDER_NAME }
  }

  // 2) 레거시 이름으로 남아있는 폴더 탐색
  for (const legacyName of LEGACY_FOLDER_NAMES) {
    const legacy = await ctx.findFolderByName(legacyName)
    if (legacy) {
      return {
        action: 'rename',
        legacyFolderId: legacy.id,
        legacyName,
        targetName: SIMPLE_NOTE_FOLDER_NAME,
      }
    }
  }

  // 3) 아무것도 없음 (호출자가 createFolder 호출)
  return { action: 'none', targetName: SIMPLE_NOTE_FOLDER_NAME }
}
