export type LanguageMode = string

export interface TabState {
  id: string
  filePath: string | null
  fileName: string
  content: string
  encoding: string
  isDirty: boolean
  language: LanguageMode
  /** 수동으로 언어 모드를 오버라이드했을 때 true */
  languageOverridden: boolean
  /** 마크다운 미리보기 표시 여부 (탭별 독립) */
  showPreview: boolean
  /** 수동 rename 시 true — H1 자동 이름 추출 비활성화 */
  tabNameOverridden: boolean
  /** 이 탭이 Drive 클라우드 파일에서 열렸다면 해당 fileId. 로컬/새 탭은 undefined. */
  cloudFileId?: string
  /** 마지막으로 서버와 동기화됐을 때의 Drive etag/headRevisionId. 3-way merge base 추적. */
  cloudBaseEtag?: string
}
