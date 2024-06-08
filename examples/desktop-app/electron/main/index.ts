import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  screen,
  PrintToPDFOptions,
} from "electron";
import { release } from "node:os";
import { join } from "node:path";
import fs from 'fs';
import { writeFile } from "fs";
import axios from "axios";
import { utils } from "@benefitjs/core";
// import {  /*serialport,*/ sqlite } from "@benefitjs/node";
import { helper } from "../../src/public/helper";
import { log } from "../../src/public/log";
import { sqlite } from "../../src/public/sqlite";
// import "../../src/public/ws-server";



// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.js    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, "..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist/app");
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, "../public")
  : process.env.DIST;

// Disable GPU Acceleration for Windows 7
if (release().startsWith("6.1")) app.disableHardwareAcceleration();

// Set application name for Windows 10+ notifications
if (process.platform === "win32") app.setAppUserModelId(app.getName());

if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null;
// Here, you can also use other preload
const preload = join(__dirname, "../preload/index.js");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

helper.ipcMain = ipcMain;
log.debug("instance.ipcMain", process.pid);

async function createWindow() {
  const displays = screen.getAllDisplays();
  const primaryDisplay = displays[0];

  // 获取显示器的宽度和高度
  const { width, height } = primaryDisplay.size;

  log.debug(`屏幕，宽度: ${width}, 高度: ${height}`);

  // 不显示界面
  app.setLoginItemSettings({
    openAtLogin: true,
    openAsHidden: true,
  });

  log.debug(`win.width: ${width * 0.6}, win.height: ${height * 0.8}`);

  log.info('sqlite ==>:', sqlite);

  win = new BrowserWindow({
    title: "Main window",
    icon: join(process.env.VITE_PUBLIC, "favicon.ico"),
    width: Math.max(width * 0.8, 1920),
    height: Math.max(height * 0.9, 1080),
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true, // 为了解决require 识别问题
      contextIsolation: false,
      // enableRemoteModule: true,
    },
  });

  helper.mainWin = win;
  if (process.env.VITE_DEV_SERVER_URL) {
    // electron-vite-vue#298
    win.loadURL(url);
    // Open devTool if the app is not packaged
    helper.openDevTools({
      mode: "right",
    });
  } else {
    win.loadFile(indexHtml);
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    log.debug("did-finish-load ...");
    // 发送到渲染线程(发送到浏览器)
    win?.webContents.send(
      "main-process-message",
      JSON.stringify({ id: utils.uuid(), time: utils.dateFmt(Date.now()) })
    );
  });

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    log.debug("setWindowOpenHandler, url:", url);
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on('will-navigate', (event, url) => { log.debug('[will-navigate] url ==>', url) }) //#344

  setTimeout(() => {
    log.debug("获取串口 ...");

    // serialport
    //   .list()
    //   .then((ports) => log.debug("ports:", ports))
    //   .catch((err) => log.error(err));

    // // // 开始探测
    // serialport.detector.start(true);

    sqlite.log


    //
    try {

      axios
        .get('http://pr.sensecho.com/support/api/system/time')
        .then(resp => {
          log.info(resp.status, resp.data, resp.headers);
          log.info('\n当前时间: ' + utils.dateFmtS(resp.data['result']));
        })
        .catch(err => log.error(err))

      // let file = 'D:/Jicco_2.3.8.apk'
      // let url = 'http://192.168.142.1:80/api/simple/uploadStream?filename=Jicco_2.3.8.apk';
      // axios
      //   .post(url, { file: fs.createReadStream(file) }, { headers: { "Content-Type": "multipart/form-data" }})
      //   .then(resp => log.info(resp))
      //   .catch(err => log.error(err))
    } catch (err) {
      log.error(err);
    }

  }, 2000);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  log.debug("window-all-closed...");
  win = null;
  if (process.platform !== "darwin") app.quit();
  // app.quit();
});

app.on("second-instance", () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.on("activate", () => {
  const allWindows = BrowserWindow.getAllWindows();
  if (allWindows.length) {
    allWindows[0].focus();
  } else {
    createWindow();
  }
});

// New window example arg: new windows url
ipcMain.handle("open-win", (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${url}#${arg}`);
  } else {
    childWindow.loadFile(indexHtml, { hash: arg });
  }
});
