# v0.8.1 (Mon Apr 13 2026)

#### 🐛 Bug Fix

- fix: remove scrollbar-color/scrollbar-width, use webkit-scrollbar only ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.8.0 (Mon Apr 13 2026)

#### 🚀 Enhancement

- feat: add missing menu items to Windows CustomMenu ([@yurseria](https://github.com/yurseria))

#### 🐛 Bug Fix

- fix: use opaque hex for scrollbar-thumb to fix WebKit rendering ([@yurseria](https://github.com/yurseria))
- fix: sync package versions from release tag before build ([@yurseria](https://github.com/yurseria))

#### ⚠️ Pushed to `release`

- docs: add DESIGN.md with macOS Tauri baseline UI spec ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.7.0 (Sun Apr 12 2026)

#### 🚀 Enhancement

- feat: platform-aware update checker with copy command support ([@yurseria](https://github.com/yurseria))

#### 🐛 Bug Fix

- fix: add Electron to sync-version targets and sync all to 0.6.5 ([@yurseria](https://github.com/yurseria))
- fix: add WebKit scrollbar compatibility and reduce width to 4px ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.6.5 (Fri Apr 10 2026)

#### 🐛 Bug Fix

- fix: align release artifact filenames with git tag version ([@yurseria](https://github.com/yurseria))

#### ⚠️ Pushed to `release`

- chore: remove Electron from release pipeline, simplify Tauri artifact names ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.6.4 (Fri Apr 10 2026)

#### 🐛 Bug Fix

- fix: resolve closed tab reopen failure and detect external file changes ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.6.3 (Fri Apr 10 2026)

#### 🐛 Bug Fix

- fix: add --publish never to electron-builder to prevent auto-upload ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.6.2 (Fri Apr 10 2026)

#### 🐛 Bug Fix

- fix: remove invalid nsis.installMode from tauri.conf.json ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.6.1 (Fri Apr 10 2026)

#### 🐛 Bug Fix

- fix: skip rename for non-Note files and narrow Tauri artifact glob ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.6.0 (Fri Apr 10 2026)

#### 🚀 Enhancement

- feat: add in-app update to Electron via electron-updater ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.5.0 (Fri Apr 10 2026)

#### 🚀 Enhancement

- feat: add in-app update via Help menu using tauri-plugin-updater ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.4.0 (Thu Apr 09 2026)

#### 🚀 Enhancement

- feat: sync preview scroll to editor cursor position ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.6 (Thu Apr 09 2026)

#### 🐛 Bug Fix

- fix: sync all package versions to 0.3.5 and fix sync script ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.5 (Thu Apr 09 2026)

#### 🐛 Bug Fix

- fix: add Tauri Linux build and flatten artifact paths ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.4 (Thu Apr 09 2026)

#### 🐛 Bug Fix

- fix: sync version to all packages and distinguish Electron/Tauri assets ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.3 (Thu Apr 09 2026)

#### 🐛 Bug Fix

- fix: use bash shell for ls step on Windows runner ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.2 (Thu Apr 09 2026)

#### 🐛 Bug Fix

- fix: fix Electron artifact upload path and disable auto-publish ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.1 (Thu Apr 09 2026)

#### 🐛 Bug Fix

- fix: set artifactName to avoid scoped package path in deb output ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.0 (Thu Apr 09 2026)

#### 🚀 Enhancement

- feat: auto-convert CSV/TSV clipboard paste to markdown table ([@yurseria](https://github.com/yurseria))
- feat: add markdown formatting keyboard shortcuts (⌘B/I/K, ⌘⇧X) ([@yurseria](https://github.com/yurseria))
- feat: change Zen mode shortcut to Cmd+E ([@yurseria](https://github.com/yurseria))
- feat: sync native macOS menu with React menu items ([@yurseria](https://github.com/yurseria))

#### 🐛 Bug Fix

- fix: remove invalid tagPrefix from .autorc ([@yurseria](https://github.com/yurseria))
- fix: use v-prefix tags to match existing release naming ([@yurseria](https://github.com/yurseria))
- fix: set explicit output directory for electron-builder ([@yurseria](https://github.com/yurseria))
- fix: reset lock file after auto install to avoid dirty tree ([@yurseria](https://github.com/yurseria))
- fix: checkout release branch instead of tag for packaging ([@yurseria](https://github.com/yurseria))
- fix: add homepage to electron package.json for deb packaging ([@yurseria](https://github.com/yurseria))
- chore(release): release simple-note 0.2.0 [#1](https://github.com/yurseria/simple-note/pull/1) ([@github-actions[bot]](https://github.com/github-actions[bot]))
- fix: pin electronVersion in build config for electron-builder ([@yurseria](https://github.com/yurseria))
- fix: improve Zen mode on macOS — drag region, key repeat ([@yurseria](https://github.com/yurseria))

#### ⚠️ Pushed to `release`

- chore: rewrite install.sh and update release template ([@yurseria](https://github.com/yurseria))
- ci: add macOS builds to release workflow ([@yurseria](https://github.com/yurseria))
- Merge branch 'main' into release ([@yurseria](https://github.com/yurseria))
- Merge branch 'release' of https://github.com/yurseria/simple-note into release ([@yurseria](https://github.com/yurseria))
- docs: add quick install section with curl one-liner ([@yurseria](https://github.com/yurseria))
- ci: use conventional-commits plugin for PR-less releases ([@yurseria](https://github.com/yurseria))
- ci: switch to intuit/auto for release automation ([@yurseria](https://github.com/yurseria))
- ci: auto bump + tag + release on push to release branch ([@yurseria](https://github.com/yurseria))
- ci: replace release-please with tag-based release workflow ([@yurseria](https://github.com/yurseria))
- ci: revamp release workflow — Electron + Tauri packaging, no macOS signing ([@yurseria](https://github.com/yurseria))
- ci: split CI into Build Electron and Build Tauri jobs ([@yurseria](https://github.com/yurseria))
- ci: add CI workflow and release-please auto-release pipeline ([@yurseria](https://github.com/yurseria))

#### Authors: 2

- [@github-actions[bot]](https://github.com/github-actions[bot])
- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.0 (Thu Apr 09 2026)

#### 🚀 Enhancement

- feat: auto-convert CSV/TSV clipboard paste to markdown table ([@yurseria](https://github.com/yurseria))
- feat: add markdown formatting keyboard shortcuts (⌘B/I/K, ⌘⇧X) ([@yurseria](https://github.com/yurseria))

#### 🐛 Bug Fix

- fix: set explicit output directory for electron-builder ([@yurseria](https://github.com/yurseria))
- fix: reset lock file after auto install to avoid dirty tree ([@yurseria](https://github.com/yurseria))
- fix: checkout release branch instead of tag for packaging ([@yurseria](https://github.com/yurseria))
- fix: add homepage to electron package.json for deb packaging ([@yurseria](https://github.com/yurseria))

#### ⚠️ Pushed to `release`

- chore: rewrite install.sh and update release template ([@yurseria](https://github.com/yurseria))
- ci: add macOS builds to release workflow ([@yurseria](https://github.com/yurseria))
- Merge branch 'main' into release ([@yurseria](https://github.com/yurseria))
- Merge branch 'release' of https://github.com/yurseria/simple-note into release ([@yurseria](https://github.com/yurseria))
- docs: add quick install section with curl one-liner ([@yurseria](https://github.com/yurseria))
- ci: use conventional-commits plugin for PR-less releases ([@yurseria](https://github.com/yurseria))
- ci: switch to intuit/auto for release automation ([@yurseria](https://github.com/yurseria))
- ci: auto bump + tag + release on push to release branch ([@yurseria](https://github.com/yurseria))
- ci: replace release-please with tag-based release workflow ([@yurseria](https://github.com/yurseria))

#### Authors: 1

- minsu ([@yurseria](https://github.com/yurseria))

---

# v0.3.0 (Thu Apr 09 2026)

#### 🚀 Enhancement

- feat: auto-convert CSV/TSV clipboard paste to markdown table ([@yurseria](https://github.com/yurseria))
- feat: add markdown formatting keyboard shortcuts (⌘B/I/K, ⌘⇧X) ([@yurseria](https://github.com/yurseria))
- feat: change Zen mode shortcut to Cmd+E ([@yurseria](https://github.com/yurseria))
- feat: sync native macOS menu with React menu items ([@yurseria](https://github.com/yurseria))

#### 🐛 Bug Fix

- fix: reset lock file after auto install to avoid dirty tree ([@yurseria](https://github.com/yurseria))
- fix: checkout release branch instead of tag for packaging ([@yurseria](https://github.com/yurseria))
- fix: add homepage to electron package.json for deb packaging ([@yurseria](https://github.com/yurseria))
- chore(release): release simple-note 0.2.0 [#1](https://github.com/yurseria/simple-note/pull/1) ([@github-actions[bot]](https://github.com/github-actions[bot]))
- fix: pin electronVersion in build config for electron-builder ([@yurseria](https://github.com/yurseria))
- fix: improve Zen mode on macOS — drag region, key repeat ([@yurseria](https://github.com/yurseria))

#### ⚠️ Pushed to `release`

- chore: rewrite install.sh and update release template ([@yurseria](https://github.com/yurseria))
- ci: add macOS builds to release workflow ([@yurseria](https://github.com/yurseria))
- Merge branch 'main' into release ([@yurseria](https://github.com/yurseria))
- Merge branch 'release' of https://github.com/yurseria/simple-note into release ([@yurseria](https://github.com/yurseria))
- docs: add quick install section with curl one-liner ([@yurseria](https://github.com/yurseria))
- ci: use conventional-commits plugin for PR-less releases ([@yurseria](https://github.com/yurseria))
- ci: switch to intuit/auto for release automation ([@yurseria](https://github.com/yurseria))
- ci: auto bump + tag + release on push to release branch ([@yurseria](https://github.com/yurseria))
- ci: replace release-please with tag-based release workflow ([@yurseria](https://github.com/yurseria))
- ci: revamp release workflow — Electron + Tauri packaging, no macOS signing ([@yurseria](https://github.com/yurseria))
- ci: split CI into Build Electron and Build Tauri jobs ([@yurseria](https://github.com/yurseria))
- ci: add CI workflow and release-please auto-release pipeline ([@yurseria](https://github.com/yurseria))

#### Authors: 2

- [@github-actions[bot]](https://github.com/github-actions[bot])
- minsu ([@yurseria](https://github.com/yurseria))

---

# Changelog

## [0.2.0](https://github.com/yurseria/simple-note/compare/simple-note-v0.1.0...simple-note-v0.2.0) (2026-04-02)


### Features

* add clipboard image paste for markdown mode ([8e78e6c](https://github.com/yurseria/simple-note/commit/8e78e6c1a13ed9512f1f4ece1461316fe65e0212))
* add command palette (Ctrl+Shift+P) ([633c146](https://github.com/yurseria/simple-note/commit/633c1467663364dd516146a15ae117b8f01bdff6))
* add drag-and-drop, file associations, and Zen mode shortcut ([c909f4c](https://github.com/yurseria/simple-note/commit/c909f4ca58d7fe61fb2643a35c83043350f0461e))
* Add Info Bar mode (HUD/Status) and i18n updates ([55b3a93](https://github.com/yurseria/simple-note/commit/55b3a93e63fa6dc680e762943f53584ee8047e32))
* add interactive target selector for dev/build/package scripts ([cae432d](https://github.com/yurseria/simple-note/commit/cae432d65be9979b907d4c3b047815ef0fec5018))
* add markdown toolbar with Remix icons and various fixes ([fb0efd9](https://github.com/yurseria/simple-note/commit/fb0efd9e2521302b0c16e9111b0cc49fc5a5bea4))
* add menu mnemonics and fix mermaid re-render bug ([1347c3d](https://github.com/yurseria/simple-note/commit/1347c3d0252083574c30d648a87c257275268da1))
* add recent files menu ([8972b6b](https://github.com/yurseria/simple-note/commit/8972b6b849035f52118db66224d0054f13249fb4))
* add Zen mode for distraction-free writing ([0395e84](https://github.com/yurseria/simple-note/commit/0395e8460b017d40656303adf1c2940c6a592423))
* Auto-scroll markdown preview at bottom cursor ([a749e27](https://github.com/yurseria/simple-note/commit/a749e27db2b372e8255a5258d4d240d81e353c1d))
* change Zen mode shortcut to Cmd+E ([282f90a](https://github.com/yurseria/simple-note/commit/282f90acca2f3eeffcd9f45ed9bf748d9d48c538))
* **editor:** add Find and Replace functionality with custom panel ([3efe1ac](https://github.com/yurseria/simple-note/commit/3efe1ac6d84c5d89757780fc221c2ca42179def6))
* **editor:** 확장자 기반 문법 강조 기능 추가 ([924f52e](https://github.com/yurseria/simple-note/commit/924f52e517a396a01a186a7b401a982cfdf727f6))
* Format code and implement HUD padding ([47f9e9f](https://github.com/yurseria/simple-note/commit/47f9e9fb33012391ba8e249f3f07de7fc646286b))
* Introduce i18n support and language-aware menus ([70d83a2](https://github.com/yurseria/simple-note/commit/70d83a2555fa6f6c0fd28d664d7b64ea95695dd1))
* markdown에서 mermaid 지원 ([273b017](https://github.com/yurseria/simple-note/commit/273b01766cd535e8ce865b0a6ed02bbd6bf5561a))
* Replace editor images with simple_editor image ([814711e](https://github.com/yurseria/simple-note/commit/814711e452b5d232441f6dbd30a32c3633afe2a8))
* sync mermaid diagram theme with editor theme ([5cc7f6d](https://github.com/yurseria/simple-note/commit/5cc7f6debb16fe2cc1fe6fdf211b149a51c07402))
* sync native macOS menu with React menu items ([c8ed620](https://github.com/yurseria/simple-note/commit/c8ed6206f1130d2b08d910d421fb1979400e9996))
* tauri 버전 포함하여 monorepo로 변경 ([803d54a](https://github.com/yurseria/simple-note/commit/803d54abc0221715759dafff463f54289f720e7a))
* **ui:** 타이틀바 및 인포바 개선 ([0044972](https://github.com/yurseria/simple-note/commit/004497257901e61d9a368361fb80fdd5df5e682f))
* **windows:** implement custom titlebar and wire up custom menu actions ([48ecb68](https://github.com/yurseria/simple-note/commit/48ecb6862fb6286b61e428c80c428a3ace83eda1))
* 노트 앱 기능 구현 ([cfa879e](https://github.com/yurseria/simple-note/commit/cfa879e58e34043fa7a8baceb59a69f52f5b0270))
* 윈도우/리눅스 용 메뉴바 추가 ([fd917f4](https://github.com/yurseria/simple-note/commit/fd917f4aa47f1ad7487f22f8430f39c692d93406))


### Bug Fixes

* Downgrade vite and plugin-react ([a6abefb](https://github.com/yurseria/simple-note/commit/a6abefbec64e25d7ca519873887d43c0dc952518))
* improve close dialog and add cargo clean script ([9cdf6f6](https://github.com/yurseria/simple-note/commit/9cdf6f6668c31277f4a4dc7c69490bff11138c5f))
* improve Zen mode on macOS — drag region, key repeat ([0b3f943](https://github.com/yurseria/simple-note/commit/0b3f943adf3eb1d6e3c50499f63c4622f557b196))
* **InfoBar:** correct line count for empty content and enhance stats display with pluralization ([cff2954](https://github.com/yurseria/simple-note/commit/cff2954bd8286dd20870c41d93681367b78b3c21))
* pin electronVersion in build config for electron-builder ([b7b5da2](https://github.com/yurseria/simple-note/commit/b7b5da24507039d1aaffa017afcdb64d9b8ffa3f))
* recover removed line ([cefa518](https://github.com/yurseria/simple-note/commit/cefa5182d78e68eaccc299104a26b938446433f0))
* remove invalid dragDropEnabled from tauri.conf.json ([5c669ae](https://github.com/yurseria/simple-note/commit/5c669ae9c321f8a7842e6dcee984fab4cee05a72))
* Simplify logger to console output only ([6fd48bb](https://github.com/yurseria/simple-note/commit/6fd48bb525b7563530666f4f52b422e8100ecc6a))
* **tauri:** add missing .ico and update build config ([a1f9fe3](https://github.com/yurseria/simple-note/commit/a1f9fe32adab61eed310f243f0dfc2e9037a6145))
* **windows:** fix window controls and menu actions not working on Windows ([d41e94f](https://github.com/yurseria/simple-note/commit/d41e94fe7025bfda56def11f521d574b8f16f991))
