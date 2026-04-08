#!/usr/bin/env bash
# Simple Note - Quick installer
# Usage: curl -fsSL https://raw.githubusercontent.com/yurseria/simple-note/main/scripts/install.sh | bash
set -euo pipefail

REPO="yurseria/simple-note"
APP_NAME="Note"

# ── Helpers ──

info()  { printf '\033[1;34m%s\033[0m\n' "$*"; }
error() { printf '\033[1;31mError: %s\033[0m\n' "$*" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || error "'$1' is required but not installed."
}

# ── Detect platform ──

detect_platform() {
  local os arch
  os="$(uname -s)"
  arch="$(uname -m)"

  case "$os" in
    Darwin) OS="macos" ;;
    Linux)  OS="linux" ;;
    *)      error "Unsupported OS: $os. Please download manually from GitHub Releases." ;;
  esac

  case "$arch" in
    x86_64|amd64)  ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)             error "Unsupported architecture: $arch" ;;
  esac
}

# ── Fetch latest release info ──

fetch_latest_release() {
  need curl
  need jq

  info "Fetching latest release..."
  RELEASE_JSON="$(curl -fsSL "https://api.github.com/repos/${REPO}/releases/latest")"
  VERSION="$(echo "$RELEASE_JSON" | jq -r '.tag_name')"
  info "Latest version: $VERSION"
}

# ── Find matching asset ──

find_asset() {
  local pattern="$1"

  # Filter assets by pattern and architecture
  ASSET_URL="$(echo "$RELEASE_JSON" | jq -r \
    --arg pat "$pattern" --arg arch "$ARCH" \
    '[.assets[] | select(.name | test($pat)) | select(.name | test($arch; "i"))] | first | .browser_download_url // empty'
  )"

  # Fallback: try without arch filter (single-arch release)
  if [ -z "$ASSET_URL" ]; then
    ASSET_URL="$(echo "$RELEASE_JSON" | jq -r \
      --arg pat "$pattern" \
      '[.assets[] | select(.name | test($pat))] | first | .browser_download_url // empty'
    )"
  fi

  if [ -z "$ASSET_URL" ]; then
    error "No matching asset found for $OS/$ARCH.\n  Download manually: https://github.com/${REPO}/releases/latest"
  fi

  ASSET_NAME="$(basename "$ASSET_URL")"
  info "Found: $ASSET_NAME"
}

# ── Install on macOS ──

install_macos() {
  find_asset '\.dmg$'

  TMPDIR_CLEANUP="$(mktemp -d)"
  trap 'rm -rf "$TMPDIR_CLEANUP"' EXIT

  info "Downloading $ASSET_NAME..."
  curl -fSL --progress-bar -o "$TMPDIR_CLEANUP/$ASSET_NAME" "$ASSET_URL"

  info "Mounting disk image..."
  local mount_point
  mount_point="$(hdiutil attach "$TMPDIR_CLEANUP/$ASSET_NAME" -nobrowse -noautoopen 2>/dev/null \
    | sed -n 's/.*\(\/Volumes\/.*\)/\1/p' | tail -1)"

  if [ -z "$mount_point" ]; then
    error "Failed to mount DMG."
  fi

  local app
  app="$(find "$mount_point" -maxdepth 1 -name '*.app' | head -1)"
  if [ -z "$app" ]; then
    hdiutil detach "$mount_point" -quiet 2>/dev/null || true
    error "Could not find .app in disk image."
  fi

  info "Installing to /Applications..."
  rm -rf "/Applications/$(basename "$app")"
  cp -R "$app" /Applications/

  hdiutil detach "$mount_point" -quiet 2>/dev/null || true

  # Gatekeeper quarantine 속성 제거 — 서명/공증 없는 앱도 실행 가능하도록
  xattr -rd com.apple.quarantine "/Applications/$(basename "$app")" 2>/dev/null || true

  info "$APP_NAME has been installed to /Applications."
  echo
  echo "Open from Applications or run:"
  echo "  open -a '${APP_NAME}'"
}

# ── Install on Linux ──

install_linux() {
  if command -v dpkg >/dev/null 2>&1; then
    find_asset '\.deb$'

    TMPDIR_CLEANUP="$(mktemp -d)"
    trap 'rm -rf "$TMPDIR_CLEANUP"' EXIT

    info "Downloading $ASSET_NAME..."
    curl -fSL --progress-bar -o "$TMPDIR_CLEANUP/$ASSET_NAME" "$ASSET_URL"

    info "Installing .deb package..."
    if command -v sudo >/dev/null 2>&1; then
      sudo dpkg -i "$TMPDIR_CLEANUP/$ASSET_NAME" || sudo apt-get install -f -y
    else
      dpkg -i "$TMPDIR_CLEANUP/$ASSET_NAME"
    fi
  else
    find_asset '\.AppImage$'

    local dest="$HOME/.local/bin/simple-note"
    mkdir -p "$(dirname "$dest")"

    info "Downloading $ASSET_NAME..."
    curl -fSL --progress-bar -o "$dest" "$ASSET_URL"
    chmod +x "$dest"

    info "Installed AppImage to $dest"
    echo "Make sure ~/.local/bin is in your PATH."
  fi

  info "$APP_NAME has been installed."
}

# ── Main ──

main() {
  info "$APP_NAME Installer"
  echo

  detect_platform
  fetch_latest_release

  case "$OS" in
    macos) install_macos ;;
    linux) install_linux ;;
  esac

  echo
  info "Done!"
}

main
