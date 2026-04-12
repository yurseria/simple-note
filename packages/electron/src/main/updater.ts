import { autoUpdater } from "electron-updater";
import { BrowserWindow, clipboard, dialog, shell } from "electron";
import { logger } from "./logger";

const REPO_URL = "https://github.com/yurseria/simple-note";
const isMac = process.platform === "darwin";

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

/**
 * GitHub Releases에서 최신 버전 정보를 가져온다.
 * macOS는 코드 서명이 없어서 electron-updater를 사용할 수 없으므로
 * GitHub API로 직접 확인한다.
 */
async function checkViaGitHubApi(): Promise<void> {
  try {
    const res = await fetch(`https://api.github.com/repos/yurseria/simple-note/releases/latest`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { tag_name: string; html_url: string };
    const latest = data.tag_name.replace(/^v/, "");
    const current = autoUpdater.currentVersion.version;

    if (latest === current) {
      dialog.showMessageBox({
        type: "info",
        title: "업데이트 확인",
        message: "현재 최신 버전입니다.",
      });
      return;
    }

    const cmd = `curl -fsSL https://raw.githubusercontent.com/yurseria/simple-note/main/scripts/install.sh | bash`;

    const { response } = await dialog.showMessageBox({
      type: "info",
      title: "업데이트 확인",
      message: `새 버전 ${latest}이 있습니다.\n터미널에서 아래 명령으로 업데이트할 수 있습니다:\n\n${cmd}`,
      buttons: ["복사", "릴리스 페이지 열기", "닫기"],
      defaultId: 0,
      cancelId: 2,
    });

    if (response === 0) {
      clipboard.writeText(cmd);
    } else if (response === 1) {
      shell.openExternal(`${REPO_URL}/releases/latest`);
    }
  } catch (e) {
    logger.error("Update check failed (GitHub API)", e);
    dialog.showMessageBox({
      type: "error",
      title: "업데이트 오류",
      message: `업데이트 확인 중 오류가 발생했습니다: ${e}`,
    });
  }
}

/**
 * Windows: electron-updater로 자동 다운로드 + 설치
 */
async function checkViaAutoUpdater(): Promise<void> {
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result || !result.updateInfo) {
      dialog.showMessageBox({
        type: "info",
        title: "업데이트 확인",
        message: "현재 최신 버전입니다.",
      });
      return;
    }

    const { version } = result.updateInfo;
    const currentVersion = autoUpdater.currentVersion.version;
    if (version === currentVersion) {
      dialog.showMessageBox({
        type: "info",
        title: "업데이트 확인",
        message: "현재 최신 버전입니다.",
      });
      return;
    }

    const { response } = await dialog.showMessageBox({
      type: "info",
      title: "업데이트 확인",
      message: `새 버전 ${version}이 있습니다. 지금 업데이트하시겠습니까?`,
      buttons: ["업데이트", "나중에"],
      defaultId: 0,
      cancelId: 1,
    });

    if (response === 0) {
      autoUpdater.on("download-progress", (progress) => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
          win.setProgressBar(progress.percent / 100);
        }
      });

      await autoUpdater.downloadUpdate();

      const { response: installResponse } = await dialog.showMessageBox({
        type: "info",
        title: "업데이트 준비 완료",
        message: "업데이트가 다운로드되었습니다. 지금 재시작하시겠습니까?",
        buttons: ["재시작", "나중에"],
        defaultId: 0,
        cancelId: 1,
      });

      if (installResponse === 0) {
        autoUpdater.quitAndInstall();
      }
    }
  } catch (e) {
    logger.error("Update check failed", e);
    dialog.showMessageBox({
      type: "error",
      title: "업데이트 오류",
      message: `업데이트 확인 중 오류가 발생했습니다: ${e}`,
    });
  }
}

export async function checkForUpdates(): Promise<void> {
  if (isMac) {
    await checkViaGitHubApi();
  } else {
    await checkViaAutoUpdater();
  }
}
