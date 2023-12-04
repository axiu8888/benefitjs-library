import { BrowserWindow, IpcMain } from "electron";
import { ProxyHandlerInterceptor, ProxyMethod, invokeReflect, newProxy, proxy_apply, proxy_get, proxy_set } from "@benefitjs/core";


export interface Global {

    /**
     * 主窗口
     */
    mainWin: BrowserWindow;
    /**
     * 主进程
     */
    ipcMain: IpcMain;
    /**
     * 所有窗口
     */
    wins: BrowserWindow[];
}

export const instance = <Global> {};

console.log('当前进程:', process.pid);
