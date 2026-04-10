import { autoUpdater } from "electron-updater";
import { BrowserWindow, dialog } from "electron";
import { logger } from "./logger";

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

export async function checkForUpdates(): Promise<void> {
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
