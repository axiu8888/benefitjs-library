import { BrowserWindow, ipcMain } from "electron";
import { logger, utils } from "@benefitjs/core";
import { rpc, Event } from './rpc';
import EventEmitter from "events";

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
     * 导出的模块
     */
    const _modules = {};

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
     * 消息
     */
    const queue = new Map<string, rpc.Request & rpc.Promise>();

    // 主进程 RPC
    ipcMain.on('ipc:request[render->main]', (event, request: rpc.Request) => { // 监听发送给主进程的消息
      let targetFn = `${request.target}.${request.fn}()`;
      log.info('ipc:request[render -> main]', `request[${request.id}]`, targetFn, ...request.args);
      // event.returnValue = '调用结果'
      // event.reply('ipc:response[main->render]', '来自主进程响应: ' + utils.dateFmt(Date.now()))
      const response = <rpc.Response>{ id: request.id, code: 200, data: undefined };
      // import(request.target)
      //   .then(res => {
      //     log.info(targetFn, 'res ==>:', res);
      //     // event.sender.send('ipc:response[main->render]', response);
      //   })
      //   .catch(err => {
      //     log.error(targetFn, err);
      //   })
      new Promise((resolve, reject) => {
        try {
          let target = _modules[request.target];
          if (target && target[request.fn]) {
            let result = target[request.fn](...request.args)
            if (result instanceof Promise) result.then(resolve).catch(reject);
            else resolve(result);
          } else {
            reject(new Error('无法找到注册的模块或函数: ' + targetFn))
          }
        } catch (e) {
          reject(e)
        }
      })
        .then(res => response.data = res)
        .catch(e => {
          response.code = 400;
          response.error = (e as Error).message;
          response.data = e;
        })
        .finally(() => event.sender.send('ipc:response[main->render]', response));

      // TODO 2024-06-23 调用接口函数
      // TODO 2024-06-23 调用接口函数
      // TODO 2024-06-23 调用接口函数

    });
    ipcMain.on('ipc:response[render->main]', (event, response: rpc.Response) => {
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
          const request = <rpc.Request & rpc.Promise>{ id: utils.uuid(), target: target, fn: fn, args: [...args], resolve, reject };
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

    // 监听主进程消息
    ipcMain.on('ipc:message[render->main]', (event, ...args) => {
      let msg = args[0] as rpc.Event;
      log.info('ipc:message[main -> render]', `[${msg.channel}][${msg.id}]`, msg.data);
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
      log.info('ipc:message[main -> render]', `[${event.channel}][${event.id}]`, event.data);
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

    let bluetoothPinCallback; // 蓝牙配对回调
    let selectBluetoothCallback; //蓝牙扫描结果响应

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
      bluetoothPinCallback(response);
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
