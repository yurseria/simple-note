'use client'

import { useWebTabStore } from './webTabStore'
import { toolbarLabels } from '@simple-note/renderer/i18n/common'

// ── Translation map ──────────────────────────────────────────────────────────

const ko = {
  // 공통
  save: '저장',
  saving: '저장 중...',
  saved: '저장됨',
  download: '다운로드',
  logout: '로그아웃',
  settings: '설정',
  language: '언어',
  theme: '테마',
  themeDark: '다크',
  themeLight: '라이트',

  // 사이드바 / 탭바
  docs: '문서',
  cloud: '클라우드',
  search: '검색',
  newDoc: '새 문서',
  newFolder: '새 폴더',
  folderNamePlaceholder: '폴더 이름',
  empty: '파일이 없습니다',
  noResults: '검색 결과 없음',
  localOnly: '로컬 파일은\n데스크탑 앱에서만 지원',
  userMenu: '유저 메뉴',

  // 파일 목록
  unsaved: '저장 안 됨',
  myDocs: '내 문서',
  listLoadFailed: (msg: string) => `목록 로드 실패: ${msg}`,
  cloudBadge: '클라우드',
  conflictBadge: '⚠️ 충돌',
  offlineBlocked: '오프라인 — 열 수 없음',

  // 에디터 페이지
  back: '목록',
  preview: '미리보기',
  edit: '편집',
  loading: '로딩 중...',
  error: (msg: string) => `오류: ${msg}`,
  offlineSaveQueued: '오프라인 — 저장 대기열에 추가됨',
  renamedSaved: (name: string) => `같은 이름이 있어 "${name}"으로 저장됨`,
  cloudEditing: (email?: string) => `☁ 클라우드 · 편집 중${email ? ` · ${email}` : ''}`,
  cloudSaved: '☁ 클라우드 · 저장됨',
  cloudNew: '☁ 클라우드 · 새 문서',
  offlineEditingCache: '⚠ 오프라인 — 캐시된 사본 편집 중',

  // files 페이지 토스트
  newDocOnlineOnly: '새 문서는 온라인에서만 만들 수 있습니다',
  onlineRequired: '온라인 연결이 필요합니다',
  syncConflict: (count: number, names: string) =>
    `충돌 ${count}건 — 서버 버전을 ${names} 로 보관했습니다`,
  syncDone: (count: number) => `${count}개 동기화 완료`,
  syncFailed: (count: number) => `${count}개 동기화 실패 — 잠시 후 다시 시도합니다`,

  // 오프라인 배너
  offlineBanner: '오프라인 — 캐시된 파일만 읽을 수 있고 편집은 저장 대기열에 추가됩니다',

  // 로그인
  loginSub: '마크다운과 텍스트를\n어디서나 열어보세요',
  googleSignIn: 'Google로 계속하기',
  googleSigningIn: 'Google 로 이동 중...',

  // SyncStatusBadge
  pending: '저장 대기',
  syncing: '동기화 중',
  conflict: '충돌',

  // 상대 시간
  justNow: '방금 전',
  minsAgo: (m: number) => `${m}분 전`,
  hoursAgo: (h: number) => `${h}시간 전`,
  daysAgo: (d: number) => `${d}일 전`,
  locale: 'ko-KR',

  // HUD
  online: '온라인',
  offline: '오프라인',
  plainText: '텍스트',
  hudChar: (n: number) => `${n.toLocaleString()} 글자`,
  hudWord: (n: number) => `${n.toLocaleString()} 단어`,
  hudLine: (n: number) => `${n.toLocaleString()} 줄`,

  // 설정 speed-dial 툴팁
  editorMode: '에디터 모드',
  editorModeAuto: '자동',
  zenMode: 'ZEN 모드',
  hudBubble: 'HUD 버블',
  statusBar: '상태바',
  sidebar: '사이드바',

  // 탭 닫기 / 나가기 경고
  unsavedTabClose: '저장하지 않은 내용이 있습니다. 탭을 닫으시겠습니까?',
  unsavedLeave: '저장하지 않은 내용이 있습니다. 나가시겠습니까?',

  // 마크다운 툴바
  mdHeading: toolbarLabels.ko.heading,
  mdBold: toolbarLabels.ko.bold,
  mdItalic: toolbarLabels.ko.italic,
  mdStrikethrough: toolbarLabels.ko.strikethrough,
  mdInlineCode: toolbarLabels.ko.inlineCode,
  mdCodeBlock: toolbarLabels.ko.codeBlock,
  mdQuote: toolbarLabels.ko.quote,
  mdListUl: toolbarLabels.ko.listUl,
  mdListOl: toolbarLabels.ko.listOl,
  mdTaskList: toolbarLabels.ko.taskList,
  mdLink: toolbarLabels.ko.link,
  mdImage: toolbarLabels.ko.image,
  mdTable: toolbarLabels.ko.table,
  mdHr: toolbarLabels.ko.hr,
  mdHeadingLabels: [...toolbarLabels.ko.headingLabels],
  mdDefaultText: toolbarLabels.ko.defaultText,
  mdLinkText: toolbarLabels.ko.linkText,
  mdTableTemplate: toolbarLabels.ko.tableTemplate,
  mdPlaceholder: '# 제목을 입력하세요\n\n내용...',
  untitledMd: '제목 없음.md',
}

const en: typeof ko = {
  save: 'Save',
  saving: 'Saving...',
  saved: 'Saved',
  download: 'Download',
  logout: 'Sign out',
  settings: 'Settings',
  language: 'Language',
  theme: 'Theme',
  themeDark: 'Dark',
  themeLight: 'Light',

  docs: 'Documents',
  cloud: 'Cloud',
  search: 'Search',
  newDoc: 'New',
  newFolder: 'New Folder',
  folderNamePlaceholder: 'Folder name',
  empty: 'No files',
  noResults: 'No results',
  localOnly: 'Local files are\ndesktop app only',
  userMenu: 'User menu',

  unsaved: 'Unsaved',
  myDocs: 'My Files',
  listLoadFailed: (msg: string) => `Failed to load: ${msg}`,
  cloudBadge: 'Cloud',
  conflictBadge: '⚠️ Conflict',
  offlineBlocked: 'Offline — unavailable',

  back: 'Files',
  preview: 'Preview',
  edit: 'Edit',
  loading: 'Loading...',
  error: (msg: string) => `Error: ${msg}`,
  offlineSaveQueued: 'Offline — added to save queue',
  renamedSaved: (name: string) => `Renamed to "${name}" to avoid duplicate`,
  cloudEditing: (email?: string) => `☁ Cloud · Editing${email ? ` · ${email}` : ''}`,
  cloudSaved: '☁ Cloud · Saved',
  cloudNew: '☁ Cloud · New',
  offlineEditingCache: '⚠ Offline — editing cached copy',

  newDocOnlineOnly: 'New documents require an internet connection',
  onlineRequired: 'Internet connection required',
  syncConflict: (count: number, names: string) =>
    `${count} conflict(s) — server version saved as ${names}`,
  syncDone: (count: number) => `${count} file(s) synced`,
  syncFailed: (count: number) => `${count} file(s) failed — will retry shortly`,

  offlineBanner: 'Offline — only cached files available, edits are queued',

  loginSub: 'Access your Markdown and\ntext files from anywhere',
  googleSignIn: 'Continue with Google',
  googleSigningIn: 'Redirecting to Google...',

  unsavedTabClose: 'You have unsaved changes. Close this tab anyway?',
  unsavedLeave: 'You have unsaved changes. Leave anyway?',

  pending: 'Pending',
  syncing: 'Syncing',
  conflict: 'Conflict',

  justNow: 'just now',
  minsAgo: (m: number) => `${m}m ago`,
  hoursAgo: (h: number) => `${h}h ago`,
  daysAgo: (d: number) => `${d}d ago`,
  locale: 'en-US',

  online: 'Online',
  offline: 'Offline',
  plainText: 'Plain Text',
  hudChar: (n: number) => `${n.toLocaleString()} ${n === 1 ? 'Character' : 'Characters'}`,
  hudWord: (n: number) => `${n.toLocaleString()} ${n === 1 ? 'Word' : 'Words'}`,
  hudLine: (n: number) => `${n.toLocaleString()} ${n === 1 ? 'Line' : 'Lines'}`,

  editorMode: 'Editor mode',
  editorModeAuto: 'Auto',
  zenMode: 'ZEN mode',
  hudBubble: 'HUD bubble',
  statusBar: 'Status bar',
  sidebar: 'Sidebar',

  mdHeading: toolbarLabels.en.heading,
  mdBold: toolbarLabels.en.bold,
  mdItalic: toolbarLabels.en.italic,
  mdStrikethrough: toolbarLabels.en.strikethrough,
  mdInlineCode: toolbarLabels.en.inlineCode,
  mdCodeBlock: toolbarLabels.en.codeBlock,
  mdQuote: toolbarLabels.en.quote,
  mdListUl: toolbarLabels.en.listUl,
  mdListOl: toolbarLabels.en.listOl,
  mdTaskList: toolbarLabels.en.taskList,
  mdLink: toolbarLabels.en.link,
  mdImage: toolbarLabels.en.image,
  mdTable: toolbarLabels.en.table,
  mdHr: toolbarLabels.en.hr,
  mdHeadingLabels: [...toolbarLabels.en.headingLabels],
  mdDefaultText: toolbarLabels.en.defaultText,
  mdLinkText: toolbarLabels.en.linkText,
  mdTableTemplate: toolbarLabels.en.tableTemplate,
  mdPlaceholder: '# Enter title\n\nContent...',
  untitledMd: 'Untitled.md',
}

export type T = typeof ko
export const translations = { ko, en } as const

/** React hook — 언어 변경 시 컴포넌트 리렌더 */
export function useT(): T {
  const uiLang = useWebTabStore((s) => s.uiLang)
  return translations[uiLang]
}

/** 콜백/유틸 함수에서 사용 (React hook 규칙 미적용) */
export function getT(): T {
  return translations[useWebTabStore.getState().uiLang]
}

export function relativeTime(iso: string, t: T): string {
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60_000)
  if (m < 1) return t.justNow
  if (m < 60) return t.minsAgo(m)
  const h = Math.floor(m / 60)
  if (h < 24) return t.hoursAgo(h)
  const d = Math.floor(h / 24)
  if (d < 7) return t.daysAgo(d)
  return new Date(iso).toLocaleDateString(t.locale)
}
