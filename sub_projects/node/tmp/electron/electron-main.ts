import fs from 'node:fs';
import EventEmitter from "events";
import { BrowserWindow, ipcMain, PrintToPDFOptions, screen, shell } from "electron";
import { logger, utils } from "@benefitjs/core";
import { io } from "../io";
import { rpc } from './rpc';

/**
 * 主进程操作
 */
export namespace ElectronMain {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("electron-main", logger.Level.warn);

  /**
   * 判断当前进程是否为主进程
   */
  export const isProcess = () => process.type == 'browser';

  /**
   * 检查是否为主进程，如果不是，则抛出异常
   */
  export function requireProcess() {
    if (!isProcess()) {
      throw new Error(`当前进程为[${process.type}, ${process.pid}], 不是Electron的主进程, 请在主进程中使用`);
    }
  }

  // 打印进程
  log.log(`当前进程 [${process.type}, ${process.pid}]`);


  // checkProcess(); // 检查当前环境

  /**
     * 主窗口
     */
  export let mainWin: BrowserWindow;
  /**
    * 列出所有窗口
    */
  export const listWindows = () => BrowserWindow.getAllWindows();

  /**
   * 调用进程的函数
   * 
   * @param target 对象
   * @param fn 函数名
   * @param args 参数
   */
  export function invoke<T>(target: any, check: Function, fn: string, ...args: any) {
    return new Promise<T>((resolve, reject) => {
      try {
        check(target, target?.[fn]);
        if (target) {
          resolve(target[fn](...args));
        } else {
          reject(new Error('target 不能为undefined'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 调用主进程的函数
   * 
   * @param target 对象
   * @param fn 函数名
   * @param args 参数
   */
  export function invokeMain(target: any, error: string, fn: string, ...args: any) {
    return invoke(target, () => {
      requireProcess();
      if (!target) throw new Error(`${error}还未初始化`);
    }, fn, ...args);
  }

  /**
    * 打开开发者工具
    *
    * @param options 选项:
    */
  export const openDevTools = (options?: Electron.OpenDevToolsOptions) => invokeMain(mainWin?.webContents, 'mainWin', 'openDevTools', options);
  /**
    * 关闭开发者工具
    */
  export const closeDevTools = () => invokeMain(mainWin?.webContents, 'mainWin', 'closeDevTools');
  /**
   * 获取全部的显示
   */
  export const getAllDisplays = () => screen.getAllDisplays();
  /**
   * 获取主要的显示参数
   */
  export const getPrimaryDisplay = () => getAllDisplays()[0];

  /**
   * 导出PDF文件
   * 
   * @param options 配置
   */
  export function htmlToPdf(options: any) {
    return new Promise<any>((resolve, reject) => {
      let url = options?.url;
      let pdfPath = options?.pdfPath;
      const primaryDisplay = getPrimaryDisplay();

      let win = new BrowserWindow({
        title: "PDF生成",
        // icon: join(process.env.VITE_PUBLIC, "favicon.ico"),
        width: primaryDisplay.size.width,
        height: primaryDisplay.size.height,
        kiosk: false, // 启用无厘头模式
        show: false, // 不显示窗口
        webPreferences: {
          // preload,
          // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
          // Consider using contextBridge.exposeInMainWorld
          // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
          nodeIntegration: true, // 为了解决require 识别问题
          contextIsolation: true,
          // enableRemoteModule: true,
        },
      });
      //@ts-ignore
      win.webContents.once("did-finish-load", function (evt: any) {
        log.debug("加载完成", evt);
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
              io.mkdir(io.getParent(pdfPath)); // 创建目录
              fs.writeFile(pdfPath, buffer, (err) => {
                if (err) {
                  log.error(err);
                  reject(err);
                }
                // file written successfully
                log.debug("结束 ==>: ", pdfPath);
                setTimeout(() => {
                  try {
                    win.destroy();
                  } finally {
                    resolve(true);
                  }
                }, 1000);//销毁
              });
            })
            .catch(reject);
        }, 5000);
      });
      // Make all links open with the browser, not with the application
      win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith("https:")) shell.openExternal(url);
        return { action: "deny" };
      });
      // win.webContents.on('will-navigate', (event, url) => { }) #344
      win.loadURL(url);
    });
  }


  // ipc =================================================================================================================== ↓
  // ipc =================================================================================================================== ↓
  // ipc =================================================================================================================== ↓
  // ipc =================================================================================================================== ↓
  // ipc =================================================================================================================== ↓
  /**
   * ipc
   */
  export namespace ipc {
    /**
     * 导出的模块
     */
    const _modules: any = {};

    /**
     * 导出模块
     * 
     * @param name 模块名
     * @param target 模块对象
     * @param force 是否强制导出(覆盖已存在的模块)
     */
    export function exportModules(name: string, target: any, force = false) {
      if (!force && typeof _modules[name] !== 'undefined') {
        throw new Error(`[${name}] 模块已经被注册了`);
      }
      if (!target && typeof target == 'undefined') {
        throw new Error('导出的模块不能为undefined');
      }
      _modules[name] = target;
    }
    /**
     * 事件发布
     */
    export const emitter = new EventEmitter();
    /**
     * RPC
     */
    const manager = new rpc.Manager((req) => {
      let target = _modules[req.target];
      log.debug(`${req.target}.${req.fn}()`);
      return target ? target[req.fn] : undefined; // TODO
    });

    // 主进程 RPC
    ipcMain.on('ipc:request[render->main]', (event, request: rpc.Request) => { // 监听发送给主进程的消息
      let targetFn = `${request.target}.${request.fn}()`;
      log.debug('ipc:request[render -> main]', `request[${request.id}]`, targetFn, ...request.args);
      manager.handleRequest(request)
        .then(response => { event.sender.send('ipc:response[main->render]', response); });
    });
    ipcMain.on('ipc:response[render->main]', (event, response: rpc.Response) => {
      log.debug('ipc:response[main -> render]', `response[${response.id}]`, response.data);
      manager.handleResponse(response);
    });

    /**
     * 发送消息
     * 
     * @param fn 函数
     * @param args 参数
     */
    export function invoke(target: string, fn: string, ...args: any) {
      log.debug('ipc:request[main -> render]', `${target}.${fn}()`, ...args)
      return new Promise<any>((resolve, reject) => {
        listWindows().forEach((win) => {
          // 发送请求
          manager.invoke(target, fn, args, 30_000, (req: any) => {
            win.webContents.send('ipc:request[main->render]', { ...req, timeoutId: undefined, resolve: undefined, reject: undefined });
          })
            .catch(resolve)
            .catch(reject);
        });
      });
    }

    // 监听主进程消息
    ipcMain.on('ipc:message[render->main]', (event, ...args) => {
      let msg = args[0] as rpc.Event;
      log.debug('ipc:message[main -> render]', `[${msg.channel}][${msg.id}]`, msg.data);
      emitter.emit(msg.channel, msg.data);
    });
    /**
     * 发送消息
     * 
     * @param channel 通道 
     * @param msg 消息
     */
    export function send(channel: string, msg: any) {
      let event = <rpc.Event>{ id: utils.uuid(), channel: channel, data: msg };
      log.debug('ipc:message[main -> render]', `[${event.channel}][${event.id}]`, event.data);
      BrowserWindow.getAllWindows().forEach((win) => win.webContents.send(`ipc:message[main->render]`, event));
    }

  }


  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  /**
   * 蓝牙操作
   */
  export namespace bluetooth {

    let bluetoothPinCallback: Function | undefined = undefined; // 蓝牙配对回调
    let selectBluetoothCallback: Function | undefined = undefined; //蓝牙扫描结果响应

    export function setup() {
      // 注册监听
      listWindows().forEach(win => {
        let webContents = win.webContents;
        webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
          log.debug('select-bluetooth-device ==>', deviceList.map(d => <any>{ name: d.deviceName, id: d.deviceId }));
          event.preventDefault();
          selectBluetoothCallback = callback;
          const result = deviceList.find((device) => device.deviceName.startsWith("HSRG_11"));
          if (result) {
            callback(result.deviceId);
            selectBluetoothCallback = undefined;
          } else {
            // The device wasn't found so we need to either wait longer (eg until the
            // device is turned on) or until the user cancels the request
          }
        });

        webContents.session.setBluetoothPairingHandler((details, callback) => {
          log.debug('bluetooth-pairing-request ==>', details);
          bluetoothPinCallback = callback;
          // Send a message to the renderer to prompt the user to confirm the pairing.
          // ipc.send("bluetooth-pairing-request", details);
          webContents.send("bluetooth-pairing-request", details);
        });
      });
    }

    // Listen for a message from the renderer to get the response for the Bluetooth pairing.
    ipcMain.on("bluetooth-pairing-response", (event, response) => {
      log.debug('bluetooth-pairing-response ==>', event, response);
      if(bluetoothPinCallback) bluetoothPinCallback(response);
    });

    /**
     * 停止蓝牙扫描
     */
    export function stopScan() {
      if (selectBluetoothCallback) {
        log.debug('cancel-bluetooth-request');
        selectBluetoothCallback(""); // 停止扫描
        ipc.send('bluetooth.stopScan', '取消蓝牙扫描');
        selectBluetoothCallback = undefined;
      }
    }
  }

}
