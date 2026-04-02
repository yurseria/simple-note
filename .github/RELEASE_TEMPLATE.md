## macOS

macOS builds are unsigned (no Apple Developer certificate). To install:

### Tauri (.dmg)
1. Open the `.dmg` file
2. Drag **Note** to Applications
3. Right-click the app → **Open** (first launch only, to bypass Gatekeeper)

### Electron (.dmg / .zip)
1. Open the `.dmg` or extract the `.zip`
2. Move **Note** to Applications
3. Run: `xattr -cr /Applications/Note.app`
4. Open the app normally

> `xattr -cr` removes the quarantine flag that macOS sets on unsigned apps.

## Windows

Download and run the `.exe` (NSIS installer) or `.msi` installer.

## Linux (Electron)

Download the `.AppImage` or `.deb` package.
