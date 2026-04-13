# Simple Note — UI Design Specification

> 이 문서는 macOS(Tauri) 기준 UI 스펙입니다.
> 다른 플랫폼 빌드 시 이 문서를 기준으로 비교 검증합니다.
> CSS 변수, 폰트, 레이아웃 수치는 코드에서 추출한 값입니다.

---

## 1. 레이아웃 구조

```
┌─────────────────────────────────────┐
│ TitleBar (37px)                     │  ← macOS: 중앙 타이틀 / Windows: 커스텀 메뉴+윈도우 컨트롤
├─────────────────────────────────────┤
│ TabBar (38px)                       │  ← 탭 높이 27px, 드래그 앤 드롭
├─────────────────────────────────────┤
│ MarkdownToolbar (~32px)             │  ← 마크다운 모드에서만 표시
├──────────────┬──┬───────────────────┤
│              │  │                   │
│   Editor     │5 │ MarkdownPreview   │  ← 분할 비율 0.2~0.8 (기본 0.5)
│              │px│                   │
│              │  │                   │
├──────────────┴──┴───────────────────┤
│ InfoBar (32px / floating HUD)       │  ← 상태바 또는 플로팅 HUD
└─────────────────────────────────────┘
```

- 루트: `display: flex; flex-direction: column; height: 100vh`
- Zen 모드: TitleBar, TabBar, InfoBar, MarkdownToolbar 숨김. 드래그 영역(38px) 표시

---

## 2. 색상 변수

### Dark 테마 (기본)

| 변수 | 값 | 용도 |
|---|---|---|
| `--editor-bg` | `#282c34` | 에디터/프리뷰 배경 |
| `--gutter-bg` | `#21252b` | 줄번호 영역, 상태바 배경 |
| `--text-primary` | `#abb2bf` | 기본 텍스트 |
| `--text-muted` | `#5c6370` | 비활성 텍스트 |
| `--border-color` | `#3e4451` | 구분선, 스크롤바 thumb |
| `--tab-active-bg` | `#323842` | 활성 탭 배경 |
| `--tab-hover-bg` | `#2c313a` | 탭 hover |
| `--hud-bg` | `rgba(110, 118, 130, 0.88)` | HUD 배경 |
| `--accent-color` | `#61afef` | 강조색 (링크, 더티 표시 등) |
| `--close-btn-hover` | `rgba(255, 255, 255, 0.12)` | 닫기 버튼 hover |
| `--code-bg` | `rgba(255, 255, 255, 0.06)` | 코드 블록 배경 |
| `--code-bg-solid` | `#2c313a` | 코드 블록 배경 (불투명) |
| `--scrollbar-thumb` | `rgba(255, 255, 255, 0.15)` | 스크롤바 thumb |

### Light 테마

| 변수 | 값 |
|---|---|
| `--editor-bg` | `#fafafa` |
| `--gutter-bg` | `#f2f2f2` |
| `--text-primary` | `#282c34` |
| `--text-muted` | `#9da5b4` |
| `--border-color` | `#dde1e8` |
| `--tab-active-bg` | `#e8eaed` |
| `--tab-hover-bg` | `#f0f1f3` |
| `--accent-color` | `#4078f2` |
| `--code-bg` | `rgba(0, 0, 0, 0.05)` |
| `--code-bg-solid` | `#eaecf0` |
| `--scrollbar-thumb` | `rgba(0, 0, 0, 0.18)` |

---

## 3. 폰트 스택

| 용도 | 폰트 |
|---|---|
| UI 전역 | `"Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif` |
| 에디터 | `"[사용자 폰트]", ui-monospace, Menlo, "Apple SD Gothic Neo", "Malgun Gothic", monospace` |
| 마크다운 프리뷰 | `"Pretendard", -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif` |
| 인라인 코드 | `"SF Mono", Menlo, Monaco, monospace` |
| 툴바/팔레트 모노 | `ui-monospace, Menlo, monospace` |

- 기본 에디터 폰트 크기: **14px**
- 줄번호 폰트 크기: **13px**
- 에디터 줄높이: **1.6**
- 프리뷰 줄높이: **1.7**

---

## 4. 컴포넌트별 스펙

### TitleBar (37px)

- 배경: `var(--editor-bg)`
- 하단 경계: `1px solid var(--border-color)`
- 타이틀: 12px, opacity 0.85, 최대 40%
- 편집 표시: opacity 0.55, italic
- **macOS**: 중앙 정렬, 네이티브 드래그 영역
- **Windows**: 좌측 정렬, 커스텀 윈도우 컨트롤 (닫기 hover: `#e81123`), 각 버튼 46px

### TabBar (38px)

- 탭 높이: 27px, 최대 220px, 상단 radius 5px
- 탭 간격: 2px
- 추가 버튼: 26×26px, radius 6px, 18px 폰트
- 활성 탭: `var(--tab-active-bg)`, `var(--text-primary)`
- 비활성 탭: `var(--text-muted)`
- 닫기 버튼: 20×20px, 기본 숨김, hover시 표시
- 더티 표시: `var(--accent-color)`, 16px

### MarkdownToolbar

- padding: 3px 8px, gap: 1px
- 버튼: 16×16px SVG, padding 4px, radius 4px
- 기본 opacity: 0.7, hover: 1.0, active: 0.5
- 구분선: 1×16px, margin 0 4px
- 드롭다운 메뉴: min-width 160px, radius 6px, z-index 1000

### Editor (CodeMirror 6)

- 줄 padding: `0 16px`
- 커서: 2px (primary), 1px (secondary, opacity 0.85)
- 선택 색상 Dark: `rgba(97, 175, 239, 0.28)`
- 선택 색상 Light: `rgba(64, 120, 242, 0.22)`
- 활성줄 gutter 강조: font-weight 700
- 줄번호 gutter Dark: `#1c1f26`, Light: `#e2e5eb`

### Markdown Preview

- padding: 24px 32px, font-size: 15px
- H1: 2em, H2: 1.5em, H3: 1.25em (H1/H2에 하단 border)
- 코드블록: radius 8px, padding 16px, 코드 13px
- 인용문: 좌측 3px border, `var(--text-muted)`
- 테이블: 1px border, th에 `var(--code-bg)` 배경
- Mermaid: 중앙정렬, radius 8px, padding 16px

### InfoBar

**HUD 모드**: 플로팅 pill, 하단 20px, radius 999px, backdrop-filter blur(12px), font-size 13px

**상태바 모드**: 하단 고정 32px, 배경 `var(--gutter-bg)`, font-size 13px

### FindReplace

- 위치: 우상단 (top: 0, right: 14px), z-index 50
- 크기: 420~560px, radius 0 0 6px 6px
- 입력: 26px 높이, radius 4px
- 버튼: 26×26px (탐색), 22px 높이 (치환)

### CommandPalette

- 오버레이: `rgba(0, 0, 0, 0.3)`, z-index 200
- 패널: 500×400px (max), radius 8px
- 입력: padding 10px 14px, 14px 폰트
- 항목: padding 6px 10px, 13px 폰트
- 선택: `var(--accent-color)` 배경, 흰색 텍스트

---

## 5. 스크롤바

| 속성 | 값 | 비고 |
|---|---|---|
| `scrollbar-width` | `thin` | macOS WebKit에서 적용 |
| `::-webkit-scrollbar` width | `4px` | Windows WebView2 fallback |
| `::-webkit-scrollbar` height | `4px` | 가로 스크롤바 |
| thumb 색상 | `var(--scrollbar-thumb)` | `::-webkit-scrollbar-thumb` |
| track 색상 | `var(--editor-bg)` | `::-webkit-scrollbar-track` |
| 에디터 `scrollbarColor` | `var(--border-color) var(--editor-bg)` | extensions.ts 인라인 |

> **주의**: `scrollbar-color`를 설정하면 `::-webkit-scrollbar` 커스텀이 무시됨.
> macOS WebKit은 `scrollbar-width: thin`만, Windows WebView2는 `::-webkit-scrollbar`만 적용됨.
> 상세 규칙: `.claude/rules/css-scrollbar.md`

---

## 6. 플랫폼별 차이

### 타이틀바 & 메뉴

**렌더링 조건** (TitleBar.tsx):
- `!isMac` → CustomMenu (menuData.ts) 렌더링 — Windows/Linux 공통
- `!isMac && runtime === 'tauri'` → 커스텀 윈도우 컨트롤 렌더링

| | macOS Tauri | macOS Electron | Windows Tauri | Windows Electron | Linux Tauri |
|---|---|---|---|---|---|
| 타이틀바 | Overlay | hiddenInset | decorations: false | hidden + titleBarOverlay | 기본 |
| 메뉴 | 네이티브 (menu.rs) | 네이티브 (menu.ts) | 커스텀 (menuData.ts) | 커스텀 (menuData.ts) | 커스텀 (menuData.ts) |
| 윈도우 컨트롤 | 네이티브 (좌상단) | 네이티브 (좌상단) | 커스텀 (우상단, 46px) | 네이티브 titleBarOverlay | 커스텀 (우상단, 46px) |

> **Electron Windows**: `titleBarStyle: "hidden"`으로 네이티브 메뉴바 숨김 + `titleBarOverlay`로 네이티브 윈도우 컨트롤만 표시. 메뉴는 CustomMenu 컴포넌트.
> **Tauri Linux**: lib.rs에 Linux 전용 설정 없음. 기본 데코레이션 유지 + CustomMenu + 커스텀 윈도우 컨트롤.

### 업데이트 확인

| | macOS | Windows |
|---|---|---|
| 방식 | GitHub API → install.sh 안내 | auto-updater 자동 다운로드+설치 |
| 다이얼로그 | "복사 및 닫기" / "릴리스 페이지 열기" | "업데이트" / "나중에" |
| 이유 | 코드 서명 없어서 자동 업데이트 불가 | 서명 없이도 동작 |

### 스크롤바

| | macOS WebKit (Tauri) | Windows WebView2 (Tauri) | Chromium (Electron) |
|---|---|---|---|
| 적용되는 속성 | `scrollbar-width: thin` | `::-webkit-scrollbar` | 둘 다 (scrollbar-color 우선) |
| 커스텀 색상 | 시스템 기본 (파란 계열) | `var(--scrollbar-thumb)` | `var(--border-color)` |

### 폰트 렌더링

| | macOS | Windows |
|---|---|---|
| 한글 fallback | Apple SD Gothic Neo | Malgun Gothic |
| 안티앨리어싱 | `-webkit-font-smoothing: antialiased` | 시스템 기본 |
| 서브픽셀 렌더링 | macOS 기본 비활성 | ClearType |

---

## 7. 주요 수치 요약

| 컴포넌트 | 높이 | 너비 |
|---|---|---|
| TitleBar | 37px | 100% |
| TabBar | 38px | 100% |
| Tab | 27px | max 220px |
| MarkdownToolbar | ~32px | 100% |
| InfoBar (상태바) | 32px | 100% |
| InfoBar (HUD) | auto | auto (pill) |
| FindReplace | 28~56px | 420~560px |
| Split Divider | 100% | 5px (hit: 11px) |
| CommandPalette | max 400px | 500px |
| 스크롤바 | - | 4px |
