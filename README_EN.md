# Simple Note

<p align="center">
  <img width="200" height="200" alt="logo" src="./assets/icon.png" />
</p>

<p align="center">
  A clean and intuitive text editor designed for focused writing.
  <br/>
  Inspired by the philosophy of <a href="https://github.com/brunophilipe/Noto">brunophilipe/Noto</a>.
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
  <a href="./README.md">한국어</a> / English
</p>

![Simple Note Editor](assets/simple_editor.png)

---

## Features

### Text & Markdown Editing
- **Powerful Editing:** Efficient text editing capabilities including multiple cursors, batch selection, and block selection.
- **Convenient Navigation:** Supports find/replace and jump-to-line functionality.
- **Customizable Settings:** Freely configure indentation preservation, tab/space switching, and tab size.
- **Multilingual Support:** Prevents input errors that can occur with CJK (Korean, Chinese, Japanese) text, providing a stable typing experience.

### File Management
- **Multi-Tab Support:** Open multiple files simultaneously in tabs, reorder them with drag-and-drop, and switch between them with ease.
- **Auto-Detection:** Automatically detects text encoding when opening documents to prevent garbled characters, and automatically switches to edit mode for Markdown files.

### Markdown Optimization
- **Real-time Syntax Highlighting:** Markdown elements such as headings, bold/italic, code, and links are visually distinguished so you can focus on writing.
- **Split-Screen Preview:** View and edit your Markdown document in real time with a live preview panel. Drag the divider to freely adjust the ratio of the preview pane.
- **Safe and Accurate Rendering:** Fully supports syntax highlighting in code blocks and safely renders documents against security threats (XSS).

### User-Friendly UI
- **Dark/Light Theme:** Easily switch the editor theme to match your work environment and preference.
- **Document Statistics:** View useful information such as character count, word count, line count, and language mode in the status bar at a glance.
- **Flexible Display Settings:** Adjust zoom level, font size, and more to suit your needs.
- **Native OS Experience:** Applies the clean, native design of each operating system (macOS, Windows) for a seamless, natural user experience.
- **UI Language:** Supports Korean and English. The language is automatically detected from your OS locale on first launch and can be changed anytime via **View > UI Language**.

---

## Requirements

| Item | Electron | Tauri |
|---|---|---|
| OS | macOS 13+ / Windows 10+ / Linux | macOS 13+ / Windows 10+ / Linux |
| Node.js | v22.x | v22.x |
| npm | v10.x | v10.x |
| Rust | - | 1.77+ |

---

## Getting Started (Development)

```bash
# Install dependencies
npm install

# Run Electron version
npm run dev:electron

# Run Tauri version
npm run dev:tauri
```

## Building

```bash
# Build Electron (compile only)
npm run build:electron

# Build Tauri (compile only, no bundling)
npm run build:tauri
```

## Packaging

Generate distributable installers/packages.

```bash
# Electron packaging (dmg/zip/AppImage/deb/nsis)
npm run package:electron

# Tauri packaging (dmg/msi/AppImage/deb)
npm run package:tauri
```

Build artifacts are output to each package's directory:
- Electron: `packages/electron/dist/`
- Tauri: `packages/tauri/src-tauri/target/release/bundle/`

### ⚠️ Notes for Windows Packaging
When running `npm run package:electron` on Windows, a symbolic link creation error (`ERROR: Cannot create symbolic link`) related to `winCodeSign` may occur, causing the build to fail. This is due to Windows security policies. Resolve it using one of the following methods:

1. **Enable Developer Mode (Recommended):** Go to Windows Settings > System (or Update & Security) > For Developers > turn on **Developer Mode**.
2. **Run as Administrator:** Open your terminal (VS Code, PowerShell, CMD) with **Administrator privileges** before running the packaging command.

---

## Tech Stack

| Category | Shared | Electron | Tauri |
|---|---|---|---|
| UI | React 18 + TypeScript | | |
| Editor | CodeMirror 6 | | |
| State | Zustand 5 | | |
| Markdown | marked + highlight.js + DOMPurify | | |
| Runtime | | Electron 41 | Tauri 2 (Rust) |
| Settings | | electron-store 8 | tauri-plugin-store |
| Encoding | | chardet + iconv-lite | Rust (encoding_rs) |
| Build | | electron-vite 5 | Vite 8 + Tauri CLI |

---

## Directory Structure

```
simple-note/
├── packages/
│   ├── renderer/              # Shared frontend (@simple-note/renderer)
│   │   ├── src/
│   │   │   ├── components/    # TitleBar, TabBar, Editor, InfoBar
│   │   │   ├── hooks/         # useFile, useKeyboardShortcuts
│   │   │   ├── store/         # tabStore, settingsStore (zustand)
│   │   │   ├── i18n/          # Korean / English
│   │   │   ├── types/         # NoteAPI interface, Settings, Tab
│   │   │   ├── platform.ts    # Platform API singleton (Proxy)
│   │   │   └── App.tsx        # Main app component
│   │   └── package.json
│   │
│   ├── electron/              # Electron shell (@simple-note/electron)
│   │   ├── src/
│   │   │   ├── main/          # Electron main process
│   │   │   ├── preload/       # NoteAPI implementation (IPC bridge)
│   │   │   └── renderer/      # Entry point
│   │   └── package.json
│   │
│   └── tauri/                 # Tauri shell (@simple-note/tauri)
│       ├── src/
│       │   ├── api.ts         # NoteAPI implementation (Tauri invoke)
│       │   └── main.tsx       # Entry point
│       ├── src-tauri/         # Rust backend
│       └── package.json
│
├── package.json               # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Architecture

Frontend code is shared via the `@simple-note/renderer` package. Platform-specific native features are abstracted through the `NoteAPI` interface.

```
Electron shell ──┐
                 ├──▶ @simple-note/renderer (shared UI)
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

## License

MIT
