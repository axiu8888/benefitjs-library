import { BrowserWindow, IpcMain } from "electron";
import { log } from "./log";

/**
 * 工具类
 */
export namespace helper {
  /**
   * 主窗口
   */
  export var mainWin: BrowserWindow;
  /**
   * 主进程
   */
  export var ipcMain: IpcMain;
  /**
   * 所有窗口
   */
  export const wins: BrowserWindow[] = [];
  /**
   * 判断当前进程是否为主进程(浏览器进程)
   */
  export const isMainProcess = () => process.type == "browser";
  /**
   * 打开开发者工具
   *
   * @param options 选项:
   */
  export const openDevTools = (options?: Electron.OpenDevToolsOptions) => mainWin.webContents.openDevTools(options);
  /**
   * 关闭开发者工具
   */
  export const closeDevTools = () => mainWin.webContents.closeDevTools();

  log.info("helper 当前进程:", process.pid);
}
