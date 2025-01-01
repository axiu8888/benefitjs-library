import {
  app,
  BrowserWindow,
  screen,
  shell,
  ipcMain,
  PrintToPDFOptions,
  Size,
} from "electron";
import { release } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { log } from "../../src/public/log";
import { utils } from "@benefitjs/core";
import { io } from "@benefitjs/node";

globalThis.__filename = fileURLToPath(import.meta.url);
globalThis.__dirname = dirname(__filename);

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, "..");
process.env.DIST = join(process.env.DIST_ELECTRON, "../dist");
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
const preload = join(__dirname, "../preload/index.mjs");
const url = process.env.VITE_DEV_SERVER_URL;
const indexHtml = join(process.env.DIST, "index.html");

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

  win = new BrowserWindow({
    title: "PDF生成",
    icon: join(process.env.VITE_PUBLIC, "favicon.ico"),
    width: Math.max(width * 0.6, 960),
    height: Math.max(height * 0.8, 780),
    kiosk: false, // 启用无厘头模式
    show: false, // 不显示窗口
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      nodeIntegration: true, // 为了解决require 识别问题
      contextIsolation: true,
      // enableRemoteModule: true,
    },
  });

  // 打开开发者模式
  // let openDev = false;
  let openDev = true;
  if (openDev) {
    win.webContents.openDevTools({
      // mode: 'bottom'
      mode: "right",
    });
  }

  // // 设置窗口为全屏显示
  // win.setFullScreen(true);

  // const url = 'https://pr.sensecho.com/monitorReports/physical?reportZid=3111c6935b9f48eab1d39836feb48927&loginName=ywtest&version=undefined&extend=undefined&moduleShow=true'
  // const url = 'https://pr.sensecho.com/supportReport/v1/smwt?version=v1&reportId=599e5b01bf94422696874a1f23276ca1&extend=pfTest'
  // const url = "https://pr.sensecho.com/supportReport/sgrq?version=null&reportId=85d0bf6e8ed74c3d9dfad61036006d9f&extend=null";
  // const url = 'https://pr.sensecho.com/supportReport/sportRecory?version=null&reportId=d104d411ac1242a385aa9d2f2ab2918f&extend=null';
  // const url = 'http://192.168.1.198/supportAdmin/question.html#/preview?item=saq&reportId=c2b976f7cd974e45b86ce99b8ac4d243&version=null&extend=null';
  // const url = 'http://192.168.1.198/supportAdmin/question.html#/preview?item=saq&reportId=c2b976f7cd974e45b86ce99b8ac4d243&version=null&extend=null';
  // const url = 'https://pr.sensecho.com/supportReport/v1/smwt?version=v1&reportId=a019f0b846934f349214dbb43c0cb1ff&extend=pfTest,hrv';
  const url = 'https://pr.sensecho.com/reportPages/CAT.html?reportZid=9029725&reportType=CAT&orgZid=34&zid=6b2a4570321b4190b259bf5d5d32ef02&taskZid=9029725&login=gdszf_hsrg&reportPath=true&flag=true';
  const searchParams = new URLSearchParams(url.substring(url.indexOf("?")));
  let reportType = "";
  let reportId = "test";

  try {
    reportType = searchParams.get("item");
    if (!reportType) {
      reportType = url.substring(0, url.indexOf("?"));
      reportType = reportType.substring(reportType.lastIndexOf("/"));
      reportType = reportType ? reportType : "";
    }
    reportId = searchParams.get("reportId");
    reportId = reportId ? reportId : searchParams.get("reportZid");
    reportId = reportId ? reportId : searchParams.get("reportId");
    reportId = reportId ? reportId : searchParams.get("zid");
    reportId = reportId ? reportId : searchParams.get("id");
  } catch (err) {
    console.error(err);
    app.exit(0);
    return;
  }

  const destPdf = (`${process.cwd()}/dist/pdf/${reportType}__${reportId}.pdf`)
    .replace(/\\/g, '/')
    .replace(/\/\//g, '/')

  // const confPath = 'D:/tmp/cache/conf.json';
  // if (fs.existsSync(confPath)) {
  //   fs.readFile(confPath, { encoding: 'utf-8' } , (err, data) => {
  //     if(err) {
  //       log.error(err);
  //       return
  //     }
  //   })
  // } else {
  //   log.debug('配置不存在!');
  //   fs.writeFileSync('', '');
  // }

  win.webContents.once("did-finish-load", function (evt) {
    log.debug("加载完成", JSON.stringify(evt));
    setTimeout(() => {
      log.debug("printToPDF..................");
      win.webContents
        .printToPDF(<PrintToPDFOptions>{
          displayHeaderFooter: false,
          preferCSSPageSize: true,
          pageSize: "A4",
          printBackground: true,
        })
        .then((buffer) => {
          io.createFile(destPdf);
          fs.writeFile(destPdf, buffer, (err) => {
            if (err) {
              console.error(err);
            }
            // file written successfully
            log.debug("结束 ==>: ", destPdf);
            app.quit(); // 结束
          });
        })
        .catch((err) => console.error(err));
    }, 5000);
  });
  win.webContents.on("did-finish-load", function (evt) {
    log.debug("加载完成 ==>:", evt);
  });
  win.webContents.session.webRequest.onBeforeRedirect((details) => {
    log.debug("Redirecting to: ", details.redirectURL);

    // 在重定向请求时获取地址并执行其他操作
  });
  // Test actively push message to the Electron-Renderer
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });
  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https:")) shell.openExternal(url);
    return { action: "deny" };
  });
  // win.webContents.on('will-navigate', (event, url) => { }) #344

  win.loadURL(url);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  win = null;
  if (process.platform !== "darwin") app.quit();
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

/**
 * PDF参数
 */
export interface PdfOptions {
  /**
   * URL地址
   */
  url: string;
  /**
   * 延迟生成时长，防止js未执行完，生成失败
   */
  delay: number;
  /**
   * 导出的目录，默认: /opt/pdfs
   */
  outDir: string;
  /**
   * PDF 名称
   */
  pdfName: string;
  /**
   * PDF的配置
   */
  options: PrintToPDFOptions;
}

const PRINT_TO_PDF_OPTIONS = <PrintToPDFOptions>{
  landscape: false, // 不横屏
  displayHeaderFooter: true, // 显示页眉页脚
  printBackground: undefined, // 是否打印背景
  scale: undefined, // 缩放比
  pageSize: "A4", // A4
  margins: undefined, // 边距
  pageRanges: undefined, // 也
  preferCSSPageSize: true, // 优先 CSS 渲染页面大小
};
