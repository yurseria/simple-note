import type { Translations } from './types'

export const ko: Translations = {
  menu: {
    file: '파일',
    edit: '편집',
    view: '보기',
    go: '이동',
    help: '도움말'
  },
  file: {
    newTab: '새 탭 열기',
    open: '파일 열기...',
    save: '저장',
    saveAs: '다른 이름으로 저장...',
    closeTab: '탭 닫기',
    quit: '종료'
  },
  edit: {
    undo: '실행 취소',
    redo: '다시 실행',
    cut: '잘라내기',
    copy: '복사',
    paste: '붙여넣기',
    selectNextOccurrence: '다음 일치 항목 선택 추가',
    selectAllOccurrences: '모든 일치 항목 선택',
    selectAll: '전체 선택',
    find: '찾기...',
    replace: '바꾸기...'
  },
  view: {
    appearance: '모양',
    toggleLineNumbers: '줄 번호 표시/숨기기',
    toggleToolbar: '툴바 표시/숨기기',
    theme: '테마',
    themeLight: '밝게 (Light)',
    themeDark: '어둡게 (Dark)',
    languageMode: '언어 모드',
    plainText: '일반 텍스트',
    markdown: '마크다운',
    zoom: '확대/축소',
    zoomIn: '확대',
    zoomOut: '축소',
    zoomReset: '기본값으로 복원',
    toggleFullScreen: '전체 화면 전환',
    uiLanguage: 'UI 언어',
    korean: '한국어',
    english: 'English'
  },
  go: {
    gotoLine: '지정 줄로 이동...'
  },
  help: {
    about: '정보',
    devTools: '개발자 도구 전환'
  },
  dialog: {
    gotoLineLabel: '줄로 이동:',
    gotoBtn: '이동',
    cancelBtn: '취소'
  },
  infobar: {
    charSingular: '글자',
    charPlural: '글자',
    wordSingular: '단어',
    wordPlural: '단어',
    lineSingular: '줄',
    linePlural: '줄',
    langToggleTip: '클릭해서 언어 전환'
  }
}
