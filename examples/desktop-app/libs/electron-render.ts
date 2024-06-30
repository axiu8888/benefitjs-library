import { binary, logger, processEnv, utils } from "@benefitjs/core";
import { GattUUID } from "@benefitjs/devices";
import { ipcRenderer } from "electron";
import EventEmitter from "events";
import { rpc } from './rpc';

/**
 * 渲染进程操作
 */
export namespace ElectronRender {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("electron-render", logger.Level.warn);

  /**
   * 判断当前进程是否为渲染进程(浏览器进程)
   */
  export const isProcess = () => process.type == 'renderer';

  /**
   * 检查是否为渲染进程，如果不是，则抛出异常
   */
  export function requireProcess() {
    if (!isProcess()) {
      throw new Error(`当前进程为[${process.type}, ${process.pid}], 不是Electron的渲染进程, 请在渲染进程中使用,`);
    }
  }


  // 打印进程
  log.log(`当前进程 [${process.type}, ${process.pid}]`);

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
     * 事件发布
     */
    export const emitter = new EventEmitter();

    /**
     * 导出的模块
     */
    const modules = {};

    /**
     * 消息
     */
    const manager = new rpc.Manager((req) => {
      // 返回模块对象
      return req.target != 'window' ? modules[req.target][req.fn] : window[req.fn];
    });
    /**
     * 调用RPC
     */
    ipcRenderer.on('ipc:request[main->render]', (event, request: rpc.Request) => {
      log.debug('ipc:request[main -> render]', `${request.target}.${request.fn}()`, request);
      manager.handleRequest(request)
        .then(response => { event.sender.send('ipc:response[render->main]', response); });
    });
    ipcRenderer.on('ipc:response[main->render]', (event, response: rpc.Response) => {
      log.debug('ipc:response[main -> render]', `response[${response.id}]`, response.data);
      manager.handleResponse(response);
    });

    /**
     * 调用主线程函数
     * 
     * @param fn 函数
     * @param args 参数
     */
    export function invoke(target: string, fn: string, ...args: any) {
      return manager.invoke(target, fn, args, 30_000, (req) => {
        log.debug('ipc:request[render -> main]', `req[${req.id}]`, `${target}.${fn}()`, ...args);
        ipcRenderer.send('ipc:request[render->main]', { ...req, timeoutId: undefined, resolve: undefined, reject: undefined });
      });
    }

    // 监听主进程消息
    ipcRenderer.on('ipc:message[main->render]', (event, ...args) => {
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
      log.debug('ipc:message[render -> main]', `[${event.channel}][${event.id}]`, event.data);
      ipcRenderer.send(`ipc:message[render->main]`, event);
    }

  }

  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓
  // bluetooth =================================================================================================================== ↓

  /**
   * Web蓝牙
   */
  export namespace bluetooth {

    /**
     * 暴漏的事件
     */
    export const events = ['bluetooth.startScan', 'bluetooth.stopScan', 'bluetooth.devices'];

    // 检查当前进程
    requireProcess();

    /**
     * 获取蓝牙对象
     */
    //@ts-ignore
    export const bluetooth = () => processEnv.isBrowser() ? navigator.bluetooth : undefined;
    /**
     * 是否支持蓝牙
     */
    export const support = () => typeof bluetooth() != 'undefined';

    /**
     * 检查蓝牙是否可用
     */
    export function getAvailability() {
      return new Promise<boolean>((resolve, reject) => {
        if (support()) {
          bluetooth()
            .getAvailability()
            //.then((available: boolean) => {})
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error(`当前环境不支持蓝牙操作[${processEnv.getType()}]`));
        }
      });
    }

    /**
     * 开始扫描蓝牙
     * 
     *  filters: [
     *     {services: ['heart_rate']},
     *     {services: [0x1802, 0x1803]},
     *     {services: ['c48e6067-5295-48d3-8d5c-0395f61792b1']},
     *     {name: '设备名'},
     *     {namePrefix: '前缀'}
     *  ],
     * 
     *  optionalServices: ['battery_service']
     * 
     */
    export function startScan(optional: ScanOptional) {
      return new Promise<[bluetooth.BluetoothDevice]>((resolve, reject) => {
        if (support()) {
          return bluetooth()
            .requestDevice(optional)
            //.then((device: WebBluetooth.BluetoothDevice) => device)
            .then(resolve)
            .catch(reject);
        }
        reject(new Error('仅允许在浏览器环境调用此方法'));
      });
    }

    /**
     * 停止蓝牙扫描
     */
    export function stopScan() {
      return new Promise<any>((resolve, reject) => {
        ipc.invoke('ElectronMain.bluetooth', 'stopScan')
          .then(resolve)
          .catch(reject);
      });
    }

    /**
     * 扫描条件
     */
    export interface ScanOptional {
      /**
       * 可选的服务ID
       */
      optionalServices?: string[];
      /**
       * 是否接收全部设备，配合optionalServices使用
       */
      acceptAllDevices?: boolean;
      /**
       * 过滤
       */
      filters?: Array<{ namePrefix?: string, name?: string, services?: string[] }>
    }


    /**
     * 连接客户端
     */
    export class Client<T extends Client<any>> {
      /**
       * 监听
       */
      readonly listeners = <IGattListener<T>[]>[];
      /**
       * GATT服务
       */
      readonly gatt: BluetoothRemoteGATTServer;

      /**
       * 客户端
       *
       * @param device 设备
       */
      constructor(
        public readonly device: BluetoothDevice,
        public uuid: GattUUID
      ) {
        // 构造函数
        this.gatt = this.device.gatt;
        // 监听设备断开
        this.device.ongattserverdisconnected = (event: any) => this.onDisconnected(event);
      }

      protected self(): T {
        return this as any;
      }

      /**
       * 是否已连接
       */
      isConnected() {
        return this.gatt.connected;
      }

      /**
       * 连接设备
       */
      connect(): Promise<BluetoothRemoteGATTServer> {
        return new Promise<BluetoothRemoteGATTServer>((resolve, reject) => {
          if (this.isConnected()) {
            resolve(this.gatt);
          } else {
            this.gatt
              .connect()
              .then((res) => {
                log.debug("connect", this.device, res);
                this.onConnected(res);
                resolve(res);
              })
              .catch((err) => {
                log.debug("connect", this.device, err);
                reject(err);
              });
          }
        });
      }

      /**
       * 连接并监听数据
       */
      connectAndNotification(): Promise<BluetoothRemoteGATTCharacteristic> {
        return new Promise<BluetoothRemoteGATTCharacteristic>((resolve, reject) => {
          this.connect()
            .then(res => {
              this.startNotifications()
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
        });
      }

      /**
       * 断开连接
       */
      disconnect() {
        return new Promise<BluetoothDevice>((resolve, reject) => {
          if (this.isConnected()) {
            try {
              this.gatt.disconnect();
              log.debug("disconnect", this.device);
              resolve(this.device);
            } catch (err) {
              log.debug("disconnect", this.device, err);
              reject(err);
            }
          } else {
            resolve(this.device);
          }
        });
      }

      /**
       * 写入数据，并返回结果
       */
      writeValueWithResponse(value: number[] | Uint8Array | ArrayBuffer) {
        return new Promise<any>((resolve, reject) => {
          this.getWriteCharacteristic()
            .then(ch => {
              value = binary.asArrayBuffer(value)
              ch.writeValueWithResponse(value)
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
        });
      }

      /**
       * 写入数据，无响应
       */
      writeValueWithoutResponse(value: number[] | Uint8Array | ArrayBuffer) {
        return new Promise<any>((resolve, reject) => {
          this.getWriteCharacteristic()
            .then(ch => {
              value = binary.asArrayBuffer(value)
              ch.writeValueWithoutResponse(value)
                .then(resolve)
                .catch(reject);
            })
            .catch(reject);
        });
      }

      /**
       * 获取主要的服务
       */
      getPrimaryService(uuid: string) {
        return this.gatt.getPrimaryService(uuid);
      }

      /**
       * 获取主要的服务
       */
      getPrimaryServices() {
        return this.gatt.getPrimaryServices();
      }

      /**
       * 获取特征
       * 
       * @param serviceId 服务的UUID
       * @param characteristicId 特征的UUID
       * @returns 返回获取的特征
       */
      getCharacteristic(serviceId: string, characteristicId: string) {
        return new Promise<BluetoothRemoteGATTCharacteristic>(
          (resolve, reject) => {
            if (this.isConnected()) {
              this.gatt
                .getPrimaryService(serviceId)
                .then((service) => {
                  service
                    .getCharacteristic(characteristicId)
                    .then(resolve)
                    .catch(reject);
                })
                .catch(reject);
            } else {
              reject(new Error(`[${this.device.name}]设备未连接`));
            }
          }
        );
      }

      /**
       * 获取通知的特征
       */
      getNotificationCharacteristic(serviceId?: string, characteristicId?: string) {
        serviceId = [serviceId, this.uuid.notifyService, this.uuid.service].filter(id => id && id.length > 0)[0];
        characteristicId = [characteristicId, this.uuid.notifyCharacteristic].filter(id => id && id.length > 0)[0];
        return this.getCharacteristic(serviceId!, characteristicId!);
      }

      /**
       * 获取读取的特征
       */
      geReadCharacteristic(serviceId?: string, characteristicId?: string) {
        serviceId = [serviceId, this.uuid.readService, this.uuid.service].filter(id => id && id.length > 0)[0];
        characteristicId = [characteristicId, this.uuid.readCharacteristic].filter(id => id && id.length > 0)[0];
        return this.getCharacteristic(serviceId!, characteristicId!);
      }

      /**
       * 获取写入的特征
       */
      getWriteCharacteristic(serviceId?: string, characteristicId?: string) {
        serviceId = [serviceId, this.uuid.writeService, this.uuid.service].filter(id => id && id.length > 0)[0];
        characteristicId = [characteristicId, this.uuid.writeCharacteristic].filter(id => id && id.length > 0)[0];
        return this.getCharacteristic(serviceId!, characteristicId!);
      }

      /**
       * 开启数据通知
       */
      startNotifications(serviceId?: string, characteristicId?: string) {
        return new Promise<BluetoothRemoteGATTCharacteristic>((resolve, reject) => {
          this.getNotificationCharacteristic(serviceId, characteristicId)
            .then((ch) => {
              // 启动监听
              ch.oncharacteristicvaluechanged = (event) => this.onCharacteristicChanged(event);
              ch.startNotifications().then(resolve).catch(reject);
            })
            .catch(reject);
        });
      }

      /**
       * 停止数据通知
       */
      stopNotifications(serviceId?: string, characteristicId?: string) {
        return new Promise<BluetoothRemoteGATTCharacteristic>((resolve, reject) => {
          this.getNotificationCharacteristic(serviceId, characteristicId)
            .then((ch) => ch.stopNotifications().then(resolve).catch(reject).finally(() => ch.oncharacteristicvaluechanged = undefined))
            .catch(reject);
        });
      }

      // ===========================================================================================================================
      // ===========================================================================================================================
      // ===========================================================================================================================

      protected onConnected(...args: any) {
        log.debug("onConnected", ...args);
        this.listeners.forEach((l) => apply(l.onConnected, this.self(), ...args));
      }

      /**
       * 
       * 接收到数据
       * 
       * let value = event.target.value as DataView;
       * 
       * let data = new Uint8Array(value.buffer, 0, value.buffer.byteLength);
       * 
       * let hex = binary.bytesToHex(data);
       * 
       * @param args 参数
       */
      protected onCharacteristicChanged(...args: any) {
        log.debug("onCharacteristicChanged", ...args);
        this.listeners.forEach((l) =>
          apply(l.onCharacteristicChanged, this.self(), ...args)
        );
      }

      protected onCharacteristicWrite(...args: any) {
        log.debug("onCharacteristicWrite", ...args);
        this.listeners.forEach((l) =>
          apply(l.onCharacteristicWrite, this.self(), ...args)
        );
      }

      protected onDisconnected(...args: any) {
        log.debug("onDisconnected", ...args);
        this.listeners.forEach((l) =>
          apply(l.onDisconnected, this.self(), ...args)
        );
      }
    }

    /**
     * GATT监听
     */
    export interface IGattListener<T extends Client<T>> {
      /**
       * 设备连接
       *
       * @param client 客户端
       */
      onConnected?(client: T): void;

      /**
       * 接收到数据
       *
       * let value = event.target.value as DataView;
       * 
       * let data = new Uint8Array(value.buffer, 0, value.buffer.byteLength);
       * 
       * let hex = binary.bytesToHex(data);
       *
       * @param client 客户端
       * @param event 事件
       */
      onCharacteristicChanged?(client: T, event: any): void;

      /**
       * 写入数据
       *
       * @param client 客户端
       * @param value 写入的值
       */
      onCharacteristicWrite?(client: T, value: number[] | Uint8Array): void;

      /**
       * 设备断开
       *
       * @param client 客户端
       */
      onDisconnected?(client: T): void;
    }

    /**
     * 蓝牙设备
     */
    export interface BluetoothDevice {
      /**
       * 设备ID
       */
      id: string;
      /**
       * 蓝牙名
       */
      name: string;
      /**
       * GATT
       */
      gatt: BluetoothRemoteGATTServer;

      /**
       *
       */
      watchAdvertisements(): Promise<any>;

      /**
       *
       */
      forget(): Promise<any>;

      /**
       * 连接断开监听
       */
      ongattserverdisconnected?(event: any): void;
    }

    /**
     * 远程GATT服务
     */
    export interface BluetoothRemoteGATTServer {
      /**
       * 设备
       */
      readonly device: BluetoothDevice;

      /**
       * 是否已连接
       */
      readonly connected: boolean;

      /**
       * 连接
       */
      connect(): Promise<BluetoothRemoteGATTServer>;

      /**
       * 断开
       */
      disconnect(): void;

      /**
       * 获取主要服务
       */
      getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;

      /**
       * 当设备连接成功后，可以获取全部的主要服务
       */
      getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
    }

    /**
     * 服务
     */
    export interface BluetoothRemoteGATTService {
      /**
       * 设备
       */
      readonly device: BluetoothDevice;

      /**
       * 是否为主要服务
       */
      readonly isPrimary: boolean;

      /**
       * UUID
       */
      readonly uuid: string;

      /**
       * 获取特征值
       */
      getCharacteristic(uuid: string): Promise<any>;
    }

    /**
     * 特征值
     */
    export interface BluetoothRemoteGATTCharacteristic {
      /**
       * 属性
       */
      readonly properties: BluetoothCharacteristicProperties;
      /**
       * UUID
       */
      readonly uuid: string;
      /**
       * 服务
       */
      service: BluetoothRemoteGATTService;
      /**
       * 数据
       */
      value: any;

      /**
       * 特征值监听
       */
      oncharacteristicvaluechanged?(event: any): void;

      /**
       * 获取描述符
       */
      getDescriptor(): Promise<BluetoothRemoteGATTDescriptor>;
      /**
       * 获取描述符
       */
      getDescriptors(): Promise<BluetoothRemoteGATTDescriptor[]>;

      /**
       * 读取值
       */
      readValue(): Promise<DataView>;

      /**
       * 写入值
       */
      writeValue(value: ArrayBuffer): Promise<any>;

      /**
       * 写入值
       */
      writeValueWithResponse(value: ArrayBuffer): Promise<any>;

      /**
       * 写入值
       */
      writeValueWithoutResponse(value: ArrayBuffer): Promise<DataView>;

      /**
       * 开启通知
       */
      startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
      /**
       * 停止通知
       */
      stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    }

    /**
     * 特征值属性
     */
    export interface BluetoothCharacteristicProperties {
      /**
       *
       */
      authenticatedSignedWrites: boolean;
      /**
       * 是否为广播
       */
      broadcast: boolean;
      /**
       *
       */
      indicate: boolean;
      /**
       * 通知
       */
      notify: boolean;
      /**
       * 可读
       */
      read: boolean;
      /**
       * 是否可靠写入
       */
      reliableWrite: boolean;
      /**
       * 可书写辅助设备
       */
      writableAuxiliaries: boolean;
      /**
       * 是否可写
       */
      write: boolean;
      /**
       * 是否写入无响应
       */
      writeWithoutResponse: boolean;
    }

    /**
     * 描述符
     */
    export interface BluetoothRemoteGATTDescriptor {

      /**
       * UUID
       */
      uuid: string,
      /**
       * 特征
       */
      characteristic: BluetoothRemoteGATTCharacteristic;
      /**
       * 值
       */
      value: any;

      /**
       * 读取数据
       */
      readValue(): Promise<any>;

      /**
       * 读取数据
       */
      writeValue(value: any): Promise<any>;
    }

    /**
     * 调用函数
     *
     * @param fn 函数
     * @param args 参数
     */
    export function apply(fn?: Function, ...args: any) {
      if (fn) {
        try {
          fn(...args);
        } catch (err) {
          log.warn(fn, err);
        }
      }
    }
  }

}