export type LanguageMode = string

/** 마크다운 뷰 모드: 소스만 / 분할 / WYSIWYG만 */
export type MarkdownView = 'source' | 'split' | 'wysiwyg'

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
  /** 마크다운 미리보기(WYSIWYG) 패널 표시 여부 (탭별 독립) */
  showPreview: boolean
  /** WYSIWYG만 표시 (소스 패널 숨김). showPreview가 true일 때만 의미 있음 */
  previewOnly: boolean
  /** 수동 rename 시 true — H1 자동 이름 추출 비활성화 */
  tabNameOverridden: boolean
}
