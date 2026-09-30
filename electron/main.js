const { app, BrowserWindow, dialog, ipcMain, Notification } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const APP_NAME = "PharmaDesk";
app.setName(APP_NAME);

const START_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";
const SERVER_PATH = path.join(process.resourcesPath, "app", "server.js");
const DATABASE_CONFIG_PATH = path.join(app.getPath("userData"), "pharmadesk.json");
const APP_DATA_PATH = app.getPath("appData");
const DATABASE_ENV_PATH = path.join(APP_DATA_PATH, "PharmaDesk.env");
const DATABASE_CONFIG_PATHS = [
  DATABASE_CONFIG_PATH,
  path.join(path.dirname(app.getPath("exe")), "pharmadesk.json"),
  path.join(APP_DATA_PATH, "pharma-desc", "pharmadesk.json"),
  path.join(APP_DATA_PATH, "PharmaDesk", "pharmadesk.json"),
];
const PRISMA_ENGINE_PATH = path.join(process.resourcesPath, "app", "node_modules", ".prisma", "client", "query_engine-windows.dll.node");
const SERVER_PORT = 3000;
const ICON_PATH = app.isPackaged
  ? path.join(process.resourcesPath, "app", "public", "icon.ico")
  : path.join(__dirname, "..", "public", "icon.ico");
const gotSingleInstanceLock = app.requestSingleInstanceLock();

log.transports.file.level = "info";
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

let mainWindow = null;
let nextServer = null;
let lastProgressNotification = 0;
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
    notify("Updates unavailable", "Could not reach the update server. PharmaDesk will continue working.");
    return;
  }

  log.error("Auto-update failed", getSafeErrorDetails(error));
  sendUpdateStatus({ state: "error", message: "Unable to check for updates. The app will remain available.", percent: 0 });
  notify("Update problem", "PharmaDesk could not check or download an update. The app will remain open.");
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

function getDatabaseUrl() {
  let databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl && fs.existsSync(DATABASE_ENV_PATH)) {
    const contents = fs.readFileSync(DATABASE_ENV_PATH, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*DATABASE_URL\s*=\s*(.*?)\s*$/);
      if (!match) continue;

      databaseUrl = match[1].replace(/^(?:"(.*)"|'(.*)')$/, (_quoted, doubleQuoted, singleQuoted) => doubleQuoted ?? singleQuoted).trim();
      if (databaseUrl) break;
    }
  }

  if (!databaseUrl) {
    for (const configPath of DATABASE_CONFIG_PATHS) {
      if (!fs.existsSync(configPath)) continue;

      try {
        const fileContents = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(fileContents);
        const value = config.DATABASE_URL ?? config.databaseUrl ?? config.database?.url;
        if (typeof value === "string" && value.trim()) {
          databaseUrl = value.trim().replace(/^(["'])(.*)\1$/, "$2");
          break;
        }
      } catch {
        // Ignore parse errors and check next config path
      }
    }
  }

  if (!databaseUrl) {
    throw new Error(`DATABASE_URL is not configured. Set it in the environment or add it to ${DATABASE_ENV_PATH}.`);
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must start with mongodb:// or mongodb+srv://.");
  }

  return databaseUrl;
}

function waitForServer(url, child, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let lastFailure = "No health response received.";
    let retryTimer;
    const timeout = setTimeout(() => finish(new Error(`The local pharmacy server did not become healthy in time: ${lastFailure}`)), timeoutMs);

    function finish(error) {
      clearTimeout(timeout);
      clearTimeout(retryTimer);
      child.removeListener("error", onChildError);
      if (error) reject(error);
      else resolve();
    }

    function onChildError(error) {
      finish(error);
    }

    function poll() {
      if (child.exitCode !== null || child.signalCode) {
        finish(new Error(`The local pharmacy server exited (${child.exitCode ?? child.signalCode}).`));
        return;
      }

      const request = http.get(url, (response) => {
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

    child.once("error", onChildError);
    poll();
  });
}

function forwardServerOutput(stream, level) {
  let pending = "";
  stream.setEncoding("utf8");
  stream.on("data", (chunk) => {
    const lines = (pending + chunk).split(/\r?\n/);
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) log[level]("Next.js server:", redactSensitiveText(line));
    }
  });
  stream.on("end", () => {
    if (pending.trim()) log[level]("Next.js server:", redactSensitiveText(pending));
  });
}

async function startApplicationServer() {
  log.info("Starting PharmaDesk", {
    version: app.getVersion(),
    packaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    serverPath: app.isPackaged ? SERVER_PATH : START_URL,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL?.trim()),
  });

  if (!app.isPackaged) return START_URL;

  if (!fs.existsSync(SERVER_PATH)) {
    throw new Error(`Packaged Next.js server was not found at ${SERVER_PATH}. Build the app with npm run build:next.`);
  }

  const databaseUrl = getDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;
  log.info("Production database configuration loaded", { databaseUrlConfigured: true });

  if (process.platform === "win32" && fs.existsSync(PRISMA_ENGINE_PATH)) {
    process.env.PRISMA_QUERY_ENGINE_LIBRARY = PRISMA_ENGINE_PATH;
  }

  const port = SERVER_PORT;
  const serverUrl = `http://127.0.0.1:${port}`;
  nextServer = spawn(process.execPath, [SERVER_PATH], {
    cwd: path.dirname(SERVER_PATH),
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      HOSTNAME: "127.0.0.1",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
      DATABASE_URL: databaseUrl,
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  forwardServerOutput(nextServer.stdout, "info");
  forwardServerOutput(nextServer.stderr, "error");

  nextServer.on("exit", (code) => {
    if (code && !app.isQuitting) log.error(`Packaged Next.js server exited with code ${code}.`);
  });

  await waitForServer(`${serverUrl}/api/health`, nextServer);
  log.info("Packaged Next.js server health check passed", { serverUrl, database: "connected" });
  return serverUrl;
}

ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("updater:get-status", () => updateStatus);
ipcMain.on("updater:install", () => {
  if (updateStatus.state === "downloaded") autoUpdater.quitAndInstall();
});

async function createWindow(url) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: APP_NAME,
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
      detail: "Check the local app server and restart PharmaDesk.",
      buttons: ["Close"],
    });
    mainWindow.close();
  }
}

async function askToDownloadUpdate(info) {
  const options = {
    type: "info",
    title: APP_NAME,
    message: `PharmaDesk ${info.version} is available.`,
    detail: "Would you like to download and install the update?",
    buttons: ["Download update", "Later"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  };
  const result = mainWindow
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options);

  if (result.response === 0) {
    lastProgressNotification = 0;
    try {
      await autoUpdater.downloadUpdate();
    } catch (error) {
      reportUpdateError(error);
    }
  }
}

async function askToInstallUpdate() {
  const options = {
    type: "info",
    title: APP_NAME,
    message: "The update is ready to install.",
    detail: "Restart PharmaDesk now to finish installing the update?",
    buttons: ["Restart and install", "Later"],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  };
  const result = mainWindow
    ? await dialog.showMessageBox(mainWindow, options)
    : await dialog.showMessageBox(options);

  if (result.response === 0) autoUpdater.quitAndInstall();
}

autoUpdater.on("checking-for-update", () => {
  sendUpdateStatus({ state: "checking", message: "Checking for updates...", percent: 0 });
  notify("Checking for updates", "Checking whether a newer version of PharmaDesk is available.");
});

autoUpdater.on("update-available", (info) => {
  sendUpdateStatus({ state: "available", message: `Version ${info.version} is available to download.`, version: info.version, percent: 0 });
  void askToDownloadUpdate(info).catch(reportUpdateError);
});

autoUpdater.on("update-not-available", () => {
  sendUpdateStatus({ state: "up-to-date", message: "App is up to date.", percent: 0 });
  notify("Up to date", "You are using the latest version of PharmaDesk.");
});

autoUpdater.on("download-progress", (progress) => {
  sendUpdateStatus({ state: "downloading", message: "Downloading update...", percent: Math.round(progress.percent) });
  const milestone = Math.floor(progress.percent / 25) * 25;
  if (milestone >= 25 && milestone > lastProgressNotification && milestone < 100) {
    lastProgressNotification = milestone;
    notify("Downloading update", `${milestone}% downloaded`);
  }
});

autoUpdater.on("update-downloaded", () => {
  sendUpdateStatus({ state: "downloaded", message: "Restart to apply update.", percent: 100 });
  void askToInstallUpdate().catch(reportUpdateError);
});

autoUpdater.on("error", reportUpdateError);

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.isQuitting = false;
  app.on("before-quit", () => {
    app.isQuitting = true;
    if (nextServer && !nextServer.killed) nextServer.kill();
  });

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