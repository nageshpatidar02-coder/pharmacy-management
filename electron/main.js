const { app, BrowserWindow, dialog, ipcMain, Notification, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const fs = require("node:fs");
const https = require("node:https");
const http = require("node:http");
const path = require("node:path");

const APP_NAME = "PharmaDesk";
app.setName(APP_NAME);

const START_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";
const DEFAULT_CLOUD_APP_URL = "https://pharmacy-management-bay.vercel.app";
const ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "app", "public", "icon.ico")
  : path.join(__dirname, "..", "public", "icon.ico");
const gotSingleInstanceLock = app.requestSingleInstanceLock();

log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let updateStatus = {
  state: app.isPackaged ? "checking" : "development",
  message: app.isPackaged ? "Checking for updates..." : "Automatic updates are checked in installed builds.",
  percent: 0,
};

function sendUpdateStatus(status) {
  updateStatus = status;
  if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.webContents.isDestroyed()) {
    mainWindow.webContents.send("updater:status", updateStatus);
  }
}

function notify(title, body) {
  try {
    if (Notification.isSupported()) {
      new Notification({ title: APP_NAME, subtitle: title, body }).show();
    }
  } catch (error) {
    log.warn("Unable to show desktop notification", getSafeErrorDetails(error));
  }
}

function isNetworkError(error) {
  const details = `${error?.code ?? ""} ${error?.message ?? error ?? ""}`;
  return /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|offline|network/i.test(details);
}

function reportUpdateError(error) {
  if (isNetworkError(error)) {
    log.warn("Update check unavailable; the app will continue offline.", getSafeErrorDetails(error));
    sendUpdateStatus({ state: "offline", message: "Update check unavailable while offline.", percent: 0 });
    return;
  }

  log.error("Auto-update failed", getSafeErrorDetails(error));
  sendUpdateStatus({ state: "error", message: "Unable to check for updates. The app will remain available.", percent: 0 });
}

function redactSensitiveText(value) {
  return String(value)
    .replace(/(mongodb(?:\+srv)?:\/\/)[^@\s/]+@/gi, "$1[credentials-redacted]@")
    .replace(/((?:DATABASE_URL|password|token|secret)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "$1[redacted]");
}

function getSafeErrorDetails(error) {
  const details = error instanceof Error ? error.stack || error.message : String(error);
  return redactSensitiveText(details);
}

function getCloudAppUrl() {
  const appUrl = new URL(process.env.PHARMADESK_WEB_URL?.trim() || DEFAULT_CLOUD_APP_URL);
  if (appUrl.protocol !== "https:") throw new Error("PHARMADESK_WEB_URL must use HTTPS in packaged builds.");
  return appUrl.toString().replace(/\/$/, "");
}

function waitForServer(url, child = null, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let lastFailure = "No health response received.";
    let retryTimer;
    const timeout = setTimeout(() => finish(new Error(`The local pharmacy server did not become healthy in time: ${lastFailure}`)), timeoutMs);

    function finish(error) {
      clearTimeout(timeout);
      clearTimeout(retryTimer);
      child?.removeListener("error", onChildError);
      if (error) reject(error);
      else resolve();
    }

    function onChildError(error) {
      finish(error);
    }

    function poll() {
      if (child && (child.exitCode !== null || child.signalCode)) {
        finish(new Error(`The local pharmacy server exited (${child.exitCode ?? child.signalCode}).`));
        return;
      }

      const requestModule = new URL(url).protocol === "https:" ? https : http;
      const request = requestModule.get(url, (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body = (body + chunk).slice(0, 4096);
        });
        response.on("end", () => {
          let health;
          try {
            health = JSON.parse(body);
          } catch {
            health = null;
          }

          if (response.statusCode === 200 && health?.ok === true && health.database === "connected") {
            finish();
            return;
          }

          lastFailure = `HTTP ${response.statusCode ?? "unknown"}; database=${health?.database ?? "unknown"}`;
          retryTimer = setTimeout(poll, 500);
        });
      });
      request.setTimeout(2000, () => request.destroy(new Error("Health check request timed out.")));
      request.on("error", (error) => {
        lastFailure = redactSensitiveText(error.message);
        if (Date.now() >= deadline) finish(new Error(`The local pharmacy server did not become healthy: ${lastFailure}`));
        else retryTimer = setTimeout(poll, 500);
      });
    }

    child?.once("error", onChildError);
    poll();
  });
}

async function startApplicationServer() {
  log.info("Starting PharmaDesk", {
    version: app.getVersion(),
    packaged: app.isPackaged,
    appUrl: app.isPackaged ? process.env.PHARMADESK_WEB_URL || DEFAULT_CLOUD_APP_URL : START_URL,
  });

  if (!app.isPackaged) return START_URL;
  const appUrl = getCloudAppUrl();
  await waitForServer(new URL("/api/health", appUrl).toString());
  log.info("Hosted application health check passed", { origin: new URL(appUrl).origin, database: "connected" });
  return appUrl;
}

ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("updater:get-status", () => updateStatus);
ipcMain.on("updater:install", () => {
  if (updateStatus.state === "downloaded") autoUpdater.quitAndInstall();
});

async function createWindow(url) {
  const appOrigin = new URL(url).origin;
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: process.env.PHARMADESK_WINDOW_TITLE ||"PharmaDesk"|| APP_NAME,
    show: false,
    ...(fs.existsSync(ICON_PATH) ? { icon: ICON_PATH } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.webContents.on("did-finish-load", () => sendUpdateStatus(updateStatus));
  let clearedLoginUrl = "";
  const clearLoginStorage = async (_event, navigatedUrl, isMainFrame = true) => {
    if (!isMainFrame) return;
    try {
      const destination = new URL(navigatedUrl);
      if (destination.origin !== appOrigin || destination.pathname.replace(/\/$/, "") !== "/login") {
        clearedLoginUrl = "";
        return;
      }
      if (clearedLoginUrl === destination.href) return;
      clearedLoginUrl = destination.href;
      await mainWindow?.webContents.session.clearStorageData({
        storages: ["cookies", "localstorage", "indexdb", "serviceworkers", "cachestorage"],
      });
      log.info("Desktop session and web storage cleared on login screen.");
    } catch (error) {
      log.warn("Unable to clear desktop session storage.", getSafeErrorDetails(error));
    }
  };
  mainWindow.webContents.on("did-navigate", clearLoginStorage);
  mainWindow.webContents.on("did-navigate-in-page", clearLoginStorage);
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (new URL(navigationUrl).origin !== appOrigin) {
      event.preventDefault();
      void shell.openExternal(navigationUrl);
    }
  });
  mainWindow.webContents.setWindowOpenHandler(({ url: targetUrl }) => {
    if (new URL(targetUrl).origin === appOrigin) return { action: "allow" };
    void shell.openExternal(targetUrl);
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (!fs.existsSync(ICON_PATH)) log.warn(`Window icon not found: ${ICON_PATH}`);

  try {
    await mainWindow.loadURL(url);
  } catch (error) {
    log.error(`Unable to load app URL ${url}`, getSafeErrorDetails(error));
    await dialog.showMessageBox(mainWindow, {
      type: "error",
      title: APP_NAME,
      message: "The application could not be opened.",
      detail: "Check your internet connection and the hosted app address.",
      buttons: ["Close"],
    });
    mainWindow.close();
  }
}

autoUpdater.on("checking-for-update", () => {
  sendUpdateStatus({ state: "checking", message: "Checking for updates...", percent: 0 });
});

autoUpdater.on("update-available", (info) => {
  const availableVersion = String(info.version ?? "").replace(/^v/i, "");
  if (availableVersion === app.getVersion().replace(/^v/i, "")) {
    sendUpdateStatus({ state: "up-to-date", message: "App is up to date.", percent: 0 });
    return;
  }
  sendUpdateStatus({ state: "available", message: `Version ${info.version} is available to download.`, version: info.version, percent: 0 });
});

autoUpdater.on("update-not-available", () => {
  sendUpdateStatus({ state: "up-to-date", message: "App is up to date.", percent: 0 });
});

autoUpdater.on("download-progress", (progress) => {
  sendUpdateStatus({ state: "downloading", message: "Downloading update...", percent: Math.round(progress.percent) });
});

autoUpdater.on("update-downloaded", () => {
  sendUpdateStatus({ state: "downloaded", message: "New version ready. Restart to apply.", percent: 100 });
  notify("New version ready", "Restart to apply.");
});

autoUpdater.on("error", reportUpdateError);

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.isQuitting = false;
  app.on("before-quit", () => { app.isQuitting = true; });

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    const url = await startApplicationServer();
    await createWindow(url);

    if (app.isPackaged) {
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        reportUpdateError(error);
      }
    } else {
      log.info("Automatic update checks are disabled in development builds.");
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void startApplicationServer().then(createWindow).catch((error) => {
          log.error("Unable to restart the local app server", error);
        });
      }
    });
  }).catch(async (error) => {
    log.error("Application startup failed", getSafeErrorDetails(error));
    if (app.isReady()) {
      await dialog.showMessageBox({
        type: "error",
        title: APP_NAME,
        message: "PharmaDesk could not start.",
        detail: redactSensitiveText(error instanceof Error ? error.message : String(error)),
        buttons: ["Close"],
      });
    }
    app.quit();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}