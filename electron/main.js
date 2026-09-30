const { app, BrowserWindow, dialog, ipcMain, Notification } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const APP_NAME = "Pharma Desc";
app.setName(APP_NAME);

// Default MongoDB Cloud Connection URL
const DEFAULT_MONGODB_URL = "mongodb+srv://nageshpatidar02_db_user:3LezzlUxHGRnJDzn@cluster0.urr2ueh.mongodb.net/medical_store?retryWrites=true&w=majority";

const START_URL = process.env.ELECTRON_START_URL || "http://localhost:3000";
const SERVER_PATH = path.join(process.resourcesPath, "app", "server.js");
const DATABASE_CONFIG_PATH = path.join(app.getPath("userData"), "pharmadesk.json");
const APP_DATA_PATH = app.getPath("appData");
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
    log.warn("Unable to show desktop notification", error);
  }
}

function isNetworkError(error) {
  const details = `${error?.code ?? ""} ${error?.message ?? error ?? ""}`;
  return /ENOTFOUND|EAI_AGAIN|ECONNRESET|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|offline|network/i.test(details);
}

function reportUpdateError(error) {
  if (isNetworkError(error)) {
    log.warn("Update check unavailable; the app will continue offline.", error);
    sendUpdateStatus({ state: "offline", message: "Update check unavailable while offline.", percent: 0 });
    notify("Updates unavailable", "Could not reach the update server. Pharma Desc will continue working.");
    return;
  }

  log.error("Auto-update failed", error);
  sendUpdateStatus({ state: "error", message: "Unable to check for updates. The app will remain available.", percent: 0 });
  notify("Update problem", "Pharma Desc could not check or download an update. The app will remain open.");
}

function getDatabaseUrl() {
  let databaseUrl = process.env.DATABASE_URL?.trim();

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

  // Fallback to Default MongoDB Atlas URL if none provided
  if (!databaseUrl) {
    databaseUrl = DEFAULT_MONGODB_URL;

    try {
      fs.mkdirSync(path.dirname(DATABASE_CONFIG_PATH), { recursive: true });
      fs.writeFileSync(
        DATABASE_CONFIG_PATH,
        JSON.stringify({ DATABASE_URL: databaseUrl }, null, 2) + "\n",
        "utf8"
      );
    } catch (e) {
      log.warn("Could not write default pharmadesk.json", e);
    }
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(databaseUrl)) {
    throw new Error("DATABASE_URL must start with mongodb:// or mongodb+srv://.");
  }

  return databaseUrl;
}

function waitForServer(url, child, timeoutMs = 45000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    let retryTimer;
    const timeout = setTimeout(() => finish(new Error("The local pharmacy server did not start in time.")), timeoutMs);

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
      if (child.exitCode !== null) {
        finish(new Error(`The local pharmacy server exited with code ${child.exitCode}.`));
        return;
      }

      const request = http.get(url, (response) => {
        response.resume();
        finish();
      });
      request.setTimeout(1500, () => request.destroy());
      request.on("error", () => {
        if (Date.now() >= deadline) finish(new Error("The local pharmacy server did not start in time."));
        else retryTimer = setTimeout(poll, 250);
      });
    }

    child.once("error", onChildError);
    poll();
  });
}

async function startApplicationServer() {
  if (!app.isPackaged) return START_URL;

  if (!fs.existsSync(SERVER_PATH)) {
    throw new Error(`Packaged Next.js server was not found at ${SERVER_PATH}. Build the app with npm run build:next.`);
  }

  process.env.DATABASE_URL = getDatabaseUrl();

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
      DATABASE_URL: process.env.DATABASE_URL
    },
    stdio: "ignore",
    windowsHide: true,
  });

  nextServer.on("exit", (code) => {
    if (code && !app.isQuitting) log.error(`Packaged Next.js server exited with code ${code}.`);
  });

  await waitForServer(`${serverUrl}/login`, nextServer);
  log.info(`Packaged Next.js server ready at ${serverUrl}`);
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
    log.error(`Unable to load app URL ${url}`, error);
    await dialog.showMessageBox(mainWindow, {
      type: "error",
      title: APP_NAME,
      message: "The application could not be opened.",
      detail: "Check the local app server and restart Pharma Desc.",
      buttons: ["Close"],
    });
    mainWindow.close();
  }
}

async function askToDownloadUpdate(info) {
  const options = {
    type: "info",
    title: APP_NAME,
    message: `Pharma Desc ${info.version} is available.`,
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
    detail: "Restart Pharma Desc now to finish installing the update?",
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
  notify("Checking for updates", "Checking whether a newer version of Pharma Desc is available.");
});

autoUpdater.on("update-available", (info) => {
  sendUpdateStatus({ state: "available", message: `Version ${info.version} is available to download.`, version: info.version, percent: 0 });
  void askToDownloadUpdate(info).catch(reportUpdateError);
});

autoUpdater.on("update-not-available", () => {
  sendUpdateStatus({ state: "up-to-date", message: "App is up to date.", percent: 0 });
  notify("Up to date", "You are using the latest version of Pharma Desc.");
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
    log.error("Application startup failed", error);
    if (app.isReady()) {
      await dialog.showMessageBox({
        type: "error",
        title: APP_NAME,
        message: "Pharma Desc could not start.",
        detail: error instanceof Error ? error.message : String(error),
        buttons: ["Close"],
      });
    }
    app.quit();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}