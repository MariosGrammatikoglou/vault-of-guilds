import { app, BrowserWindow, dialog, ipcMain, desktopCapturer } from "electron";
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
  const windowIconPath =
    process.platform === "win32"
      ? path.join(process.env.APP_ROOT!, "public", "assets", "icon.ico")
      : path.join(process.env.APP_ROOT!, "public", "assets", "icon.png");

  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0e14",
    title: "Vault of Guilds",
    titleBarStyle: "hiddenInset",
    autoHideMenuBar: true,
    icon: windowIconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
  });

  autoUpdater.on("update-available", (info) => {
    console.log("Update available:", info.version);
  });

  autoUpdater.on("update-not-available", (info) => {
    console.log("No update available:", info.version);
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
      message: `Version ${info.version} is ready to install.`,
      detail: "Restart Vault of Guilds to finish updating.",
      noLink: true,
    });

    if (result === 0) {
      isInstallingUpdate = true;

      setImmediate(() => {
        // Silent install + reopen app after update
        autoUpdater.quitAndInstall(true, true);
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
      title: "Update error",
      message: "There was a problem checking for updates.",
      detail: err instanceof Error ? err.message : String(err),
    });
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, 3000);
}

ipcMain.handle("get-screen-sources", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen", "window"],
    thumbnailSize: { width: 320, height: 180 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    appIcon: s.appIcon ? s.appIcon.toDataURL() : null,
  }));
});

app.whenReady().then(() => {
  app.setName("Vault of Guilds");
  app.setAppUserModelId("com.mao.vaultofguilds");

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
