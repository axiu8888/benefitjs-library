import { BrowserWindow, ipcMain } from "electron";
import { logger, utils } from "@benefitjs/core";

/**
 * 主进程操作
 */
export namespace ElectronMain {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("electron-main", logger.Level.info);

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
  log.info(`当前进程 [${process.type}, ${process.pid}]`);


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
     * 请求
     */
    interface IpcRequest {
      /**
       * 请求ID
       */
      id: string,
      /**
       * 超时调度ID
       */
      timeoutId: any,
      /**
       * 目标对象
       */
      target: string,
      /**
       * 函数
       */
      fn: string,
      /**
       * 参数
       */
      args: any[],

      resolve: any,
      reject: any,
    }

    /**
     * 响应
     */
    interface IpcResponse {
      /**
       * 请求ID
       */
      id: string,
      /**
       * 结果码: 200/400/500
       */
      code: number,
      /**
       * 错误信息
       */
      error: string,
      /**
       * 响应结果
       */
      data: any
    }
    /**
     * 消息
     */
    const queue = new Map<string, IpcRequest>();

    // 主进程 RPC
    ipcMain.on('ipc:request[render->main]', (event, request: IpcRequest) => { // 监听发送给主进程的消息
      log.info('ipc:request[render -> main]', `request[${request.id}]`, `${request.target}.${request.fn}`, ...request.args);
      // event.returnValue = '调用结果'
      // event.reply('ipc:response[main->render]', '来自主进程响应: ' + utils.dateFmt(Date.now()))
      const response = <IpcResponse>{ id: request.id, code: 200, data: '来自主进程响应: ' + utils.dateFmt(Date.now()) };
      event.sender.send('ipc:response[main->render]', response);

      // TODO 2024-06-23 调用接口函数
      // TODO 2024-06-23 调用接口函数
      // TODO 2024-06-23 调用接口函数

    });
    ipcMain.on('ipc:response[render->main]', (event, response: IpcResponse) => {
      try {
        let request = queue.get(response.id)
        log.info('ipc:response[main -> render]', `response[${response.id}]`, response.data);
        if (!request) return;
        clearTimeout(request.timeoutId);
        if (Math.round(response.code / 200) == 1) request.resolve(response.data);
        else request.reject(new Error(response.error))
      } finally {
        queue.delete(response.id);
      }
    });

    /**
     * 发送消息
     * 
     * @param fn 函数
     * @param args 参数
     */
    export function invoke(target: string, fn: string, ...args: any) {
      return new Promise<any>((resolve, reject) => {
        listWindows().forEach((win) => {
          const targetFn = `${target}.${fn}()`;
          const request = <IpcRequest>{ id: utils.uuid(), target: target, fn: fn, args: [...args], resolve: resolve, reject: reject };
          try {
            log.info('ipc:request[main -> render]', `${targetFn}`, ...args)
            queue.set(request.id, request);
            win.webContents.send('ipc:request[main->render]', { ...request, timeoutId: undefined, resolve: undefined, reject: undefined });
            request.timeoutId = setTimeout(() => {
              queue.delete(request.id);
              request.reject(new Error(`${targetFn} 请求超时`));
            }, 5000);
          } catch (e) {
            queue.delete(request.id);
            reject(e);
          }
        });
      });
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

    let bluetoothPinCallback; // 蓝牙配对回调
    let selectBluetoothCallback; //蓝牙扫描结果响应

    /**
     * 初始化
     * 
     * @param mainWindow 
     */
    export function init(mainWindow: BrowserWindow) {
      requireProcess();
      mainWindow.webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
        log.debug('select-bluetooth-device ==>', deviceList.map(d => <any>{ name: d.deviceName, id: d.deviceId }));
        event.preventDefault();
        selectBluetoothCallback = callback;
        const result = deviceList.find((device) => device.deviceName.startsWith("HSRG_11"));
        if (result) {
          callback(result.deviceId);
        } else {
          // The device wasn't found so we need to either wait longer (eg until the
          // device is turned on) or until the user cancels the request
        }
      }
      );

      ipcMain.on("cancel-bluetooth-request", (event) => {
        log.debug('cancel-bluetooth-request ==>', event);
        selectBluetoothCallback("");
      });

      // Listen for a message from the renderer to get the response for the Bluetooth pairing.
      ipcMain.on("bluetooth-pairing-response", (event, response) => {
        log.debug('bluetooth-pairing-response ==>', event, response);
        bluetoothPinCallback(response);
      });

      mainWindow.webContents.session.setBluetoothPairingHandler((details, callback) => {
        log.debug('bluetooth-pairing-request ==>', details);
        bluetoothPinCallback = callback;
        // Send a message to the renderer to prompt the user to confirm the pairing.
        mainWindow.webContents.send("bluetooth-pairing-request", details);
      });
    }
  }

}
