# Simple Note

<p align="center">
  <img width="200" height="200" alt="logo" src="./build/icon.png" />  
</p>

<p align="center">
  A clean and intuitive text editor designed for focused writing.
  <br/>
  Inspired by the philosophy of <a href="https://github.com/brunophilipe/Noto">brunophilipe/Noto</a>.
  <br/>
  <br/>
  <a href="https://www.apple.com/macos/"><img src="https://img.shields.io/badge/macOS-13+-000000?style=for-the-badge&amp;logo=apple&amp;logoColor=white" alt="macOS"></a>
  <a href="https://www.microsoft.com/windows/"><img src="https://img.shields.io/badge/Windows-10+-0078D6?style=for-the-badge&amp;logo=data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB3aWR0aD0iMjRweCIgaGVpZ2h0PSIyNHB4IiB2aWV3Qm94PSIwIDAgMjQgMjQiIHZlcnNpb249IjEuMSI+CjxnIGlkPSJzdXJmYWNlMSI+CjxwYXRoIHN0eWxlPSIgc3Ryb2tlOm5vbmU7ZmlsbC1ydWxlOm5vbnplcm87ZmlsbDpyZ2IoMTAwJSwxMDAlLDEwMCUpO2ZpbGwtb3BhY2l0eToxOyIgZD0iTSAwIDAgTCAxMS4zNzg5MDYgMCBMIDExLjM3ODkwNiAxMS4zNzEwOTQgTCAwIDExLjM3MTA5NCBaIE0gMTIuNjIxMDk0IDAgTCAyNCAwIEwgMjQgMTEuMzcxMDk0IEwgMTIuNjIxMDk0IDExLjM3MTA5NCBaIE0gMCAxMi42MjEwOTQgTCAxMS4zNzg5MDYgMTIuNjIxMDk0IEwgMTEuMzc4OTA2IDI0IEwgMCAyNCBaIE0gMTIuNjIxMDk0IDEyLjYyMTA5NCBMIDI0IDEyLjYyMTA5NCBMIDI0IDI0IEwgMTIuNjIxMDk0IDI0ICIvPgo8L2c+Cjwvc3ZnPgo=&amp;logoColor=white" alt="Windows"></a>
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-v20.x-339933?style=for-the-badge&amp;logo=node.js&amp;logoColor=white" alt="Node.js"></a>
  <a href="https://www.npmjs.com/"><img src="https://img.shields.io/badge/npm-v10.x-CB3837?style=for-the-badge&amp;logo=npm&amp;logoColor=white" alt="npm"></a>
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

| Item | Version |
|---|---|
| Operating System | macOS 13 Ventura or later, or Windows 10 or later |
| Node.js | v20.x |
| npm | v10.x |

---

## Getting Started (Development)

```bash
# Install dependencies
npm install

# Start dev server + Electron
npm run dev
```

## Building

```bash
# Production build
npm run build

# Package for your OS
npm run package
```

Build artifacts are output to the `dist/` directory.

### ⚠️ Notes for Windows Build (Packaging)
When running `npm run package` on Windows, a symbolic link creation error (`ERROR: Cannot create symbolic link`) related to `winCodeSign` may occur, causing the build to fail. This is due to Windows security policies. Resolve it using one of the following methods:

1. **Enable Developer Mode (Recommended):** Go to Windows Settings > System (or Update & Security) > For Developers > turn on **Developer Mode**.
2. **Run as Administrator:** Open your terminal (VS Code, PowerShell, CMD) with **Administrator privileges** before running the packaging command.

---

## Tech Stack

| Category | Package |
|---|---|
| Runtime | Electron 41 |
| UI | React 18 + TypeScript |
| Editor | CodeMirror 6 |
| State Management | Zustand 5 |
| Markdown | marked + marked-highlight + highlight.js + DOMPurify |
| Settings Storage | electron-store 8 |
| Encoding | chardet + iconv-lite |
| Build | vite 8 + electron-vite 5 + electron-builder 26 |

---

## Directory Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # BrowserWindow creation
│   ├── ipc.ts      # IPC handlers (file, settings, dialogs)
│   ├── menu.ts     # OS native menu
│   ├── fileManager.ts  # File read/write + encoding
│   ├── store.ts    # Settings schema
│   └── logger.ts   # Logger
├── preload/
│   └── index.ts    # API exposure
├── types/
│   ├── settings.ts # Settings types
│   └── tab.ts      # Tab types
└── renderer/src/
    ├── App.tsx
    ├── i18n/               # Internationalization (ko / en)
    │   ├── index.ts
    │   ├── ko.ts
    │   ├── en.ts
    │   └── types.ts
    ├── components/
    │   ├── TitleBar/
    │   ├── TabBar/
    │   ├── Editor/             # Editor core + extensions
    │   │   ├── extensions.ts
    │   │   └── markdownPreview/
    │   └── InfoBar/
    ├── store/
    │   ├── tabStore.ts         # Tab state management
    │   └── settingsStore.ts
    └── hooks/
        ├── useFile.ts
        └── useMenuEvents.ts
```

---

## License

MIT
