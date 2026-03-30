import { app, BrowserWindow } from "electron";
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
let isQuittingForUpdate = false;

function createWindow() {
  const iconPath = path.join(
    process.env.APP_ROOT!,
    "public",
    "assets",
    "icon.ico",
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

function setupAutoUpdates() {
  if (!app.isPackaged) {
    console.log("Skipping auto-update in development mode.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("Checking for updates...");
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("No update available:", info.version);
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`Downloading update: ${Math.round(progress.percent)}%`);
  });

  autoUpdater.on("error", (err) => {
    console.error("Auto update error:", err);
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("Update downloaded:", info.version);

    if (isQuittingForUpdate) return;
    isQuittingForUpdate = true;

    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true);
    }, 1200);
  });

  void autoUpdater.checkForUpdates();

  setInterval(
    () => {
      void autoUpdater.checkForUpdates().catch((err) => {
        console.error("Periodic update check failed:", err);
      });
    },
    1000 * 60 * 15,
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
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
