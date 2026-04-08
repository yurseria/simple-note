# Simple Note

<p align="center">
  <img width="200" height="200" alt="logo" src="./assets/icon.png" />
</p>

<p align="center">
  집중해서 글을 쓰기 위한 깔끔하고 직관적인 텍스트 에디터
  <br/>
  <a href="https://github.com/brunophilipe/Noto">brunophilipe/Noto</a> 의 철학을 바탕으로 개발되었습니다.
  <br/>
  <br/>
  <a href="https://www.apple.com/macos/"><img src="https://img.shields.io/badge/macOS-13+-000000?style=for-the-badge&amp;logo=apple&amp;logoColor=white" alt="macOS"></a>
  <a href="https://www.microsoft.com/windows/"><img src="https://img.shields.io/badge/Windows-10+-0078D6?style=for-the-badge&amp;logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSI+CjxnIGlkPSJzdXJmYWNlMSI+CjxwYXRoIHN0eWxlPSIgc3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOm5vbnplcm87ZmlsbDpyZ2IoMTAwJSwxMDAlLDEwMCUpO2ZpbGwtb3BhY2l0eToxOyIgZD0iTSAwIDAgTCAxMS4zNzg5MDYgMCBMIDExLjM3ODkwNiAxMS4zNzEwOTQgTCAwIDExLjM3MTA5NCBaIE0gMTIuNjIxMDk0IDAgTCAyNCAwIEwgMjQgMTEuMzcxMDk0IEwgMTIuNjIxMDk0IDExLjM3MTA5NCBaIE0gMCAxMi42MjEwOTQgTCAxMS4zNzg5MDYgMTIuNjIxMDk0IEwgMTEuMzc4OTA2IDI0IEwgMCAyNCBaIE0gMTIuNjIxMDk0IDEyLjYyMTA5NCBMIDI0IDEyLjYyMTA5NCBMIDI0IDI0IEwgMTIuNjIxMDk0IDI0ICIvPgo8L2c+Cjwvc3ZnPgo=&amp;logoColor=white" alt="Windows"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v22.x-339933?style=for-the-badge&amp;logo=node.js&amp;logoColor=white" alt="Node.js"></a>
  <a href="https://www.npmjs.com/"><img src="https://img.shields.io/badge/npm-v10.x-CB3837?style=for-the-badge&amp;logo=npm&amp;logoColor=white" alt="npm"></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.77+-DEA584?style=for-the-badge&amp;logo=rust&amp;logoColor=white" alt="Rust"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License"></a>
  <br/>
  <br/>
  한국어 / <a href="./README_EN.md">English</a>
</p>

![screenshot](assets/simple_editor.png)

---

## 기능

### 텍스트 및 마크다운 편집
- **강력한 편집 기능:** 다중 커서, 일괄 선택, 블록 선택 등 효율적인 텍스트 편집 기능을 제공합니다.
- **편리한 탐색:** 찾기/바꾸기 및 특정 줄로 바로 이동하는 기능을 지원합니다.
- **맞춤형 설정:** 들여쓰기 유지, 탭/스페이스 전환 및 크기 설정을 자유롭게 할 수 있습니다.
- **다국어 지원:** 한글 등 CJK 입력 시 발생할 수 있는 오류를 방지하여 안정적인 타이핑 경험을 제공합니다.

### 파일 관리
- **다중 탭 지원:** 여러 파일을 동시에 열어놓고 탭으로 드래그 앤 드롭하여 순서를 변경하거나 편리하게 작업할 수 있습니다.
- **자동 감지 기능:** 문서를 열 때 자동으로 텍스트 인코딩을 감지하여 글자 깨짐을 방지하고, 마크다운 파일의 경우 자동으로 편집 모드를 전환합니다.
- **드래그 앤 드롭:** 탐색기에서 파일을 창 위에 끌어다 놓으면 바로 열립니다.
- **최근 파일:** 파일 메뉴에서 최근에 열었던 파일 목록에 빠르게 접근할 수 있습니다.
- **파일 연결:** `.txt`, `.md` 등의 파일을 더블클릭하면 Simple Note에서 바로 열립니다. (패키징 후 설치 시)

### 마크다운 최적화
- **마크다운 툴바:** 제목(H1~H5), 굵게, 기울임, 취소선, 코드, 인용문, 목록, 체크리스트, 링크, 이미지, 표 등 마크다운 서식을 버튼으로 빠르게 삽입할 수 있습니다. (Remix Icon 사용)
- **표 편집:** 툴바의 표 드롭다운에서 행/열 추가·삭제를 할 수 있습니다.
- **이미지 붙여넣기:** 마크다운 모드에서 클립보드 이미지를 `Ctrl+V`로 붙여넣으면 자동으로 `./images/` 폴더에 저장되고 마크다운에 삽입됩니다.
- **실시간 문법 강조:** 제목, 굵게/기울임, 코드, 링크 등 마크다운 요소들이 시각적으로 구분되어 작성에 집중할 수 있습니다.
- **분할 화면 미리보기:** 작성 중인 마크다운 문서를 실시간으로 확인하며 편집할 수 있으며, 구분선을 드래그해 미리보기 창의 비율을 자유롭게 조절할 수 있습니다.
- **Mermaid 다이어그램:** 마크다운 코드 블록에서 Mermaid 다이어그램을 렌더링합니다. 테마 변경 시 자동으로 동기화됩니다.
- **안전하고 정확한 렌더링:** 코드 블록의 구문 강조를 완벽하게 지원하며, 보안 위협(XSS)으로부터 안전하게 문서를 표시합니다.

### 사용자 친화적 UI
- **명령 팔레트:** `Ctrl+Shift+P`로 모든 명령에 빠르게 접근할 수 있습니다. 한국어/영어 양방향 검색을 지원합니다.
- **Zen 모드:** 탭바, 인포바, 툴바를 숨기고 글쓰기에 집중할 수 있습니다. (`Ctrl+Shift+Enter`, `Esc`로 해제)
- **메뉴 니모닉:** `Alt` 키로 메뉴에 포커스, `Alt+F` 등으로 메뉴 직접 열기 (Windows)
- **다크/라이트 테마:** 작업 환경과 취향에 맞게 에디터 테마를 손쉽게 변경할 수 있습니다.
- **문서 정보 표시:** 현재 문서의 글자 수, 단어 수, 줄 수 및 언어 모드 등 유용한 정보를 하단 바에서 한눈에 확인 가능합니다.
- **유연한 화면 설정:** 화면 확대/축소, 폰트 크기 조절 등을 사용자 편의에 맞게 조정할 수 있습니다.
- **OS 네이티브 경험:** 각 운영체제(macOS, Windows) 고유의 깔끔한 디자인을 적용하여 이질감 없는 매끄러운 사용성을 제공합니다.

---

## 빠른 설치

macOS 또는 Linux 환경에서 한 줄로 최신 버전을 설치할 수 있습니다.

```bash
curl -fsSL https://raw.githubusercontent.com/yurseria/simple-note/main/scripts/install.sh | bash
```

> **필요 조건:** `curl`, `jq`
>
> Windows 사용자는 [GitHub Releases](https://github.com/yurseria/simple-note/releases/latest)에서 `.exe` 또는 `.msi` 설치 파일을 직접 다운로드해주세요.

---

## 요구사항

| 항목 | Electron 버전 | Tauri 버전 |
|---|---|---|
| 운영체제 | macOS 13+ / Windows 10+ / Linux | macOS 13+ / Windows 10+ / Linux |
| Node.js | v22.x | v22.x |
| npm | v10.x | v10.x |
| Rust | - | 1.77+ |

---

## 개발 환경 실행

```bash
# 의존성 설치
npm install

# Electron 버전 실행
npm run dev:electron

# Tauri 버전 실행
npm run dev:tauri
```

## 빌드

```bash
# Electron 빌드 (코드 컴파일만)
npm run build:electron

# Tauri 빌드 (코드 컴파일만, 번들링 없음)
npm run build:tauri
```

## 패키징

배포용 인스톨러/패키지를 생성합니다.

```bash
# Electron 패키징 (dmg/zip/AppImage/deb/nsis)
npm run package:electron

# Tauri 패키징 (dmg/msi/AppImage/deb)
npm run package:tauri
```

빌드 결과물은 각 패키지의 출력 디렉터리에 생성됩니다:
- Electron: `packages/electron/dist/`
- Tauri: `packages/tauri/src-tauri/target/release/bundle/`

### ⚠️ Windows 빌드(패키징) 시 주의사항
Windows 환경에서 `npm run package:electron` 실행 시 `winCodeSign` 관련 심볼릭 링크 생성 에러(`ERROR: Cannot create symbolic link`)가 발생하며 빌드가 실패할 수 있습니다. 이는 Windows의 보안 정책 때문이며, 다음 중 하나의 방법으로 해결할 수 있습니다.

1. **개발자 모드 활성화 (권장)**: Windows 설정 > 시스템(또는 업데이트 및 보안) > 개발자용 > **'개발자 모드' 켬**으로 변경
2. **관리자 권한으로 실행**: 사용 중인 터미널(VS Code, PowerShell, CMD)을 **'관리자 권한'으로 실행**한 후 패키징 명령어 입력

---

## 기술 스택

| 구분 | 공통 | Electron | Tauri |
|---|---|---|---|
| UI | React 18 + TypeScript | | |
| 에디터 | CodeMirror 6 | | |
| 상태 관리 | Zustand 5 | | |
| 마크다운 | marked + highlight.js + DOMPurify + Mermaid | | |
| 런타임 | | Electron 41 | Tauri 2 (Rust) |
| 설정 저장 | | electron-store 8 | tauri-plugin-store |
| 인코딩 | | chardet + iconv-lite | Rust (encoding_rs) |
| 빌드 | | electron-vite 5 | Vite 8 + Tauri CLI |

---

## 디렉터리 구조

```
simple-note/
├── packages/
│   ├── renderer/              # 공유 프론트엔드 (@simple-note/renderer)
│   │   ├── src/
│   │   │   ├── components/    # TitleBar, TabBar, Editor, InfoBar, CommandPalette
│   │   │   ├── hooks/         # useFile, useKeyboardShortcuts
│   │   │   ├── store/         # tabStore, settingsStore (zustand)
│   │   │   ├── i18n/          # 한국어/영어
│   │   │   ├── types/         # NoteAPI 인터페이스, Settings, Tab
│   │   │   ├── platform.ts    # 플랫폼 API 싱글톤 (Proxy)
│   │   │   └── App.tsx        # 메인 앱 컴포넌트
│   │   └── package.json
│   │
│   ├── electron/              # Electron shell (@simple-note/electron)
│   │   ├── src/
│   │   │   ├── main/          # Electron 메인 프로세스
│   │   │   ├── preload/       # NoteAPI 구현 (IPC bridge)
│   │   │   └── renderer/      # Entry point
│   │   └── package.json
│   │
│   └── tauri/                 # Tauri shell (@simple-note/tauri)
│       ├── src/
│       │   ├── api.ts         # NoteAPI 구현 (Tauri invoke)
│       │   └── main.tsx       # Entry point
│       ├── src-tauri/         # Rust 백엔드
│       └── package.json
│
├── package.json               # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## 아키텍처

프론트엔드 코드를 `@simple-note/renderer` 패키지에서 공유하고, 플랫폼별 네이티브 기능은 `NoteAPI` 인터페이스를 통해 추상화됩니다.

```
Electron shell ──┐
                 ├──▶ @simple-note/renderer (공유 UI)
Tauri shell ─────┘
                       │
                       ▼
                   NoteAPI (Proxy singleton)
                       │
            ┌──────────┼──────────┐
            ▼                     ▼
    Electron IPC            Tauri invoke
    (preload)               (Rust backend)
```

---

## 라이선스

MIT
