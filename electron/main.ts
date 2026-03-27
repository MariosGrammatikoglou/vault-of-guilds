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
let updateCheckInterval: NodeJS.Timeout | null = null;
let isCheckingForUpdates = false;

function createWindow() {
  const iconPath = path.join(
    process.env.APP_ROOT!,
    "public",
    "assets",
    "icon.png",
  );

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0e14",
    title: "Vault of Guilds",
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    icon: iconPath,
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
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

function checkForUpdates() {
  if (!app.isPackaged) {
    console.log("Skipping auto-update in development mode.");
    return;
  }

  if (isCheckingForUpdates) {
    return;
  }

  isCheckingForUpdates = true;
  console.log("Checking for updates...");

  void autoUpdater.checkForUpdates().finally(() => {
    isCheckingForUpdates = false;
  });
}

function setupAutoUpdates() {
  if (!app.isPackaged) {
    console.log("Skipping auto-update setup in development mode.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);

    void dialog.showMessageBox({
      type: "info",
      title: "Update available",
      message: `A new version (${info.version}) is available.`,
      detail: "The update is being downloaded in the background.",
    });
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("No update available:", info.version);
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`Downloading update: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);

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
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto update error:", err);

    void dialog.showMessageBox({
      type: "error",
      title: "Update error",
      message: "There was a problem checking for updates.",
      detail: err instanceof Error ? err.message : String(err),
    });
  });

  // first check a few seconds after app starts
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

  // check again every 30 minutes while app stays open
  updateCheckInterval = setInterval(
    () => {
      checkForUpdates();
    },
    30 * 60 * 1000,
  );
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
  if (updateCheckInterval) {
    clearInterval(updateCheckInterval);
    updateCheckInterval = null;
  }

  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
