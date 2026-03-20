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
}
