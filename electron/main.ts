import { app, BrowserWindow, dialog } from "electron";
import { autoUpdater } from "electron-updater";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null = null;
let hasShownUpdaterError = false;
let isInstallingUpdate = false;

function createWindow() {
  const winIconPath =
    process.platform === "win32"
      ? path.join(process.env.APP_ROOT!, "public", "assets", "icon.png")
      : path.join(process.env.APP_ROOT!, "public", "assets", "icon.ico");

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0e14",
    title: "Vault of Guilds",
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    icon: winIconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  win.setMenuBarVisibility(false);

  win.webContents.on("did-finish-load", () => {
    win?.setTitle("Vault of Guilds");
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    void win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    void win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

function setupAutoUpdates() {
  if (!app.isPackaged) {
    console.log("Skipping auto-update in development mode.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
    void dialog.showMessageBox({
      type: "info",
      title: "Updater",
      message: `Checking for updates...`,
      detail: `Current version: ${app.getVersion()}`,
    });
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
    void dialog.showMessageBox({
      type: "info",
      title: "Updater",
      message: `Update available: ${info.version}`,
      detail: `Current version: ${app.getVersion()}\nDownloading in background.`,
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("No update available:", info.version);
    void dialog.showMessageBox({
      type: "info",
      title: "Updater",
      message: "No update available.",
      detail: `Current version: ${app.getVersion()}\nLatest seen version: ${info.version}`,
    });
  });

  autoUpdater.on("download-progress", (progress) => {
    const percent = Math.round(progress.percent);
    console.log(`Downloading update: ${percent}%`);

    if (win && !win.isDestroyed()) {
      win.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);

    if (win && !win.isDestroyed()) {
      win.setProgressBar(-1);
    }

    if (isInstallingUpdate) return;

    const result = dialog.showMessageBoxSync({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update ready",
      message: `Version ${info.version} has been downloaded.`,
      detail: "Restart the app to apply the update.",
    });

    if (result === 0) {
      isInstallingUpdate = true;
      setImmediate(() => {
        autoUpdater.quitAndInstall(false, true);
      });
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto update error:", err);

    if (win && !win.isDestroyed()) {
      win.setProgressBar(-1);
    }

    if (hasShownUpdaterError) return;
    hasShownUpdaterError = true;

    void dialog.showMessageBox({
      type: "error",
      title: "Updater error",
      message: "There was a problem checking for updates.",
      detail: err instanceof Error ? err.message : String(err),
    });
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, 3000);
}

app.whenReady().then(() => {
  app.setName("Vault of Guilds");
  createWindow();
  setupAutoUpdates();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
