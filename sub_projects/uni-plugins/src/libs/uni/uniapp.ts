import { ByteBuf, binary, utils, logger } from '@benefitjs/core';

export namespace uniapp {
  // start ==>:
  /**
   * 日志打印
   */
  export const log = logger.newProxy('uniapp', logger.Level.warn);

  //@ts-ignore : 忽略可能不存在的实例
  const global = uni;
  //@ts-ignore
  export const sysInfo = uni.getSystemInfoSync();
  /**
   * 是否为Android
   */
  export const isAndroid = () => `${sysInfo.platform}`.toLowerCase() === 'android';
  /**
   * 是否为iOS
   */
  export const isIOS = () => `${sysInfo.platform}`.toLowerCase() === 'ios';

  export interface IPlugin {
    /**
     * 是否支持插件
     */
    support(): boolean;
  }

  /**
   * 引入插件的模块
   *
   * @param module 模块
   * @returns 返回插件模块对象
   */
  export function requireNativePlugin(moduleName: string): UniProxy & IPlugin {
    let module: any = {};
    const sysInfo = global.getSystemInfoSync();
    if (sysInfo.platform === 'android') {
      module = global.requireNativePlugin(moduleName);
    }
    // // #ifdef APP-ANDROID
    // module = global.requireNativePlugin(moduleName)
    // // #endif
    let proxy = new UniProxy(module) as any;
    proxy.support = proxy.source?.support;
    return proxy;
  }

  /**
   * Uni 对象代理
   */
  export class UniProxy {
    constructor(
      public source: any, // 代理的对象，默认从uni取
      public timeout: number = 2000,
      public interceptor: InvokeInterceptor = () => false,
    ) {}

    /**
     * 调用
     *
     * @param target 目标对象
     * @param fnName 函数名
     * @param args 参数
     * @param interceptor 调用拦截器，默认对象中实例
     * @param timeout 调用超时时长
     * @param options 可选参数
     * @returns 返回 Promise<UniResponse>
     */
    invoke(target: any, fnName: string, args: object = {}, interceptor?: InvokeInterceptor, timeout?: number, ...options: any): Promise<UniResponse> {
      interceptor = utils.getOrDefault(interceptor, this.interceptor);
      timeout = utils.getOrDefault(timeout, this.timeout);
      return new Promise<UniResponse>((resolve, reject) => {
        try {
          let fn = this.source[fnName];
          if (fn) {
            let wrapPromise = new UniPromise(fnName, args, resolve, reject, timeout);
            let intercepted = false;
            if (interceptor && interceptor(this, target, fnName, fn, wrapPromise)) {
              intercepted = true;
            } else {
              intercepted = false;
              try {
                wrapPromise.value = fn(
                  {
                    ...args,
                    success(res: any) {
                      wrapPromise.success(res);
                    },
                    fail(err: any) {
                      wrapPromise.fail(err);
                    },
                    complete() {
                      wrapPromise.complete();
                    },
                  },
                  ...options,
                );
              } finally {
                setTimeout(() => wrapPromise.start());
              }
            }
            log.trace(`fnName: ${fnName}, intercepted: ${intercepted}, wrapArgs: `, wrapPromise, fn);
          } else {
            reject(new Error('无法发现对应函数: ' + fnName));
          }
        } catch (err) {
          log.warn(`${fnName} throw error`, err);
          reject(err);
        }
      });
    }

    /**
     * 调用插件
     *
     * @param fnName 函数名
     * @param args 参数
     * @param timeout 调用超时时长
     * @param options 可选参数：如回调，其他自定义参数等
     * @returns 返回 Promise<UniResponse>
     */
    invokePlugin<T>(fnName: string, args?: object, ...callbacks: Callback<PluginResponse<any>>[]): Promise<T> {
      return new Promise<T>((resolve, reject) => {
        let fn = this.source[fnName];
        if (fn) {
          try {
            let value = fn(utils.copyAttrs(args, {}), ...callbacks);
            resolve(value);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error(`插件【${this.source}】，无法发现【${fnName}】函数`));
        }
      });
    }
  }

  // 全局的uni代理
  export const uniProxy = new UniProxy(global);

  /**
   * uniapp 的全局调用类
   */
  class UniInstance {
    /**
     * 蓝牙客户端
     */
    readonly bleClients = new Map<string, BluetoothClient<any>>();
    /**
     * 蓝牙是否可用
     */
    btEnable = false;
    /**
     * 蓝牙是否扫描中
     */
    btScanning = false;
    /**
     * 蓝牙扫描的监听 & 过滤
     */
    readonly btScanners = new Set<BtScanner>();

    tryPrint(callback = () => {}) {
      try {
        callback();
      } catch (err: any) {
        log.warn(err);
      }
    }

    /**
     * 过滤
     *
     * @param deviceId 设备ID
     * @param call
     */
    deviceFilter(deviceId: any, call: (client: BluetoothClient<any>) => void) {
      this.bleClients.forEach((client, id) => {
        if (id == deviceId) {
          call(client);
        }
      });
    }

    private readonly __BleStateChange__ = <{ deviceId: string; connected: boolean; __time__: number } & UniResponse>{};

    /**
     * 监听设备的连接状态
     *
     * @param res 消息
     */
    onBleStateChange(res: { deviceId: string; connected: boolean } & UniResponse) {
      let local = this.__BleStateChange__;
      if (local.deviceId == res.deviceId && Date.now() - local.__time__ <= 500 && local.connected == res.connected) {
        return;
      }
      utils.copyAttrs(res, local);
      local.__time__ = Date.now();
      // 该方法回调中可以用于处理连接意外断开等异常情况
      this.deviceFilter(res.deviceId, (client) => client.onConnectStatusChange(res));
    }

    /**
     * 监听设备的数据
     *
     * @param res 数据
     */
    onBleCharacteristicChange(res: UniBtDeviceResponse) {
      res.value = binary.asUint8Array(res.value);
      this.deviceFilter(res.deviceId, (client) => client.onCharacteristicChange(res));
    }

    /**
     * 监听 蓝牙扫描状态、蓝牙开关状态
     *
     * @param res 状态
     */
    onBtStateChange(res: UniResponse & { discovering: boolean; available: boolean }) {
      // 蓝牙是否可用
      this.btEnable = res.available;
      // 蓝牙是否正在扫描
      this.btScanning = res.discovering;
      setTimeout(() =>
        this.tryPrint(() => {
          if (!res.available && this.btScanners.size) {
            this.btScanners.forEach((scanner) => {
              try {
                scanner.onEvent(undefined, undefined, undefined, new Error('蓝牙适配器不可用，扫描被停止'));
              } catch (err) {
                log.warn('scanner.onEvent', err);
              } finally {
                // 移除超时操作
                clearTimeout((scanner as any).timeoutId);
              }
            });
            // 清空扫描监听
            this.btScanners.clear();
          }
        }),
      );
      if (this.btEnable && this.bleClients.size > 0) {
        setTimeout(() => utils.tryCatch(() => this.openBtAdapter()), 100); // 打开蓝牙适配器
      }
      // 调用客户端的监听
      this.deviceFilter(undefined, (client) => client.onBtStateChange(res));
    }

    /**
     * 扫描到蓝牙设备
     *
     * @param scanInfo 扫描的信息
     */
    onBtScanDevices(scanInfo: { devices: Array<BluetoothDevice> }) {
      scanInfo.devices.forEach((d) => {
        this.btScanners.forEach((scanner) => {
          try {
            if (scanner.match(d)) {
              scanner.onScanDevice(d);
            }
          } catch (err) {
            log.warn('scanner.onScanDevice', err);
          }
        });
      });
    }

    /**
     * 获取窗口信息
     */
    getWindowInfo(): WindowInfo {
      return global.getWindowInfo();
    }

    /**
     * 获取设备信息
     */
    getDeviceInfo(): DeviceInfo {
      return global.getDeviceInfo();
    }

    /**
     * 注册蓝牙监听
     */
    setupBt(): void {
      const $ = global;
      if (!$.btInitialized) {
        $.btInitialized = true;
        // 监听设备的连接状态
        if (!$.__BLEConnectionStateChange__) $.__BLEConnectionStateChange__ = (res: { deviceId: string; connected: boolean } & UniResponse) => this.onBleStateChange(res);
        else $.offBLEConnectionStateChange($.__BLEConnectionStateChange__);
        $.onBLEConnectionStateChange($.__BLEConnectionStateChange__);

        // 监听设备的数据
        if (!$.__BLECharacteristicValueChange__) $.__BLECharacteristicValueChange__ = (res: UniBtDeviceResponse) => this.onBleCharacteristicChange(res);
        else $.offBLECharacteristicValueChange($.__BLECharacteristicValueChange__);
        $.onBLECharacteristicValueChange($.__BLECharacteristicValueChange__);

        // 监听蓝牙适配器的状态
        if (!$.__BluetoothAdapterStateChange__) $.__BluetoothAdapterStateChange__ = (res: UniResponse & { discovering: boolean; available: boolean }) => this.onBtStateChange(res);
        else $.offBluetoothAdapterStateChange($.__BluetoothAdapterStateChange__);
        $.onBluetoothAdapterStateChange($.__BluetoothAdapterStateChange__);

        // 扫描到设备
        if (!$.__BluetoothDeviceFound__) $.__BluetoothDeviceFound__ = (scanInfo: { devices: Array<BluetoothDevice> }) => this.onBtScanDevices(scanInfo);
        else $.offBluetoothDeviceFound($.__BluetoothDeviceFound__);
        $.onBluetoothDeviceFound($.__BluetoothDeviceFound__);

        // 打开蓝牙适配器
        this.openBtAdapter()
          .then((resp) => log.trace(resp))
          .catch((err) => log.warn('openBtAdapter.catch ==>: ', err));
      }
    }

    /**
     * 打开蓝牙适配器
     */
    openBtAdapter(): Promise<UniResponse> {
      return new Promise<UniResponse>((resolve, reject) => {
        uniProxy
          .invoke(this, 'openBluetoothAdapter')
          .then(resolve)
          .catch((err) => {
            err.btError = BT_CODES.find((c) => c.code == err.code)?.msg;
            reject(err);
          });
      });
    }

    /**
     * 获取蓝牙适配器状态
     */
    getBtAdapterState(): Promise<UniResponse | BtAdapterStatus> {
      return uniProxy.invoke(this, 'getBluetoothAdapterState', {});
    }

    /**
     * 开始扫描
     *
     * @param timeout 超时
     * @param scanner 扫描监听
     */
    startBtScan(timeout = 60_000, scanner: BtScanner) {
      // 蓝牙扫描
      if (scanner && !this.btScanners.has(scanner)) {
        this.btScanners.add(scanner);
        let bs = scanner as any;
        if (!bs.timeoutId && timeout > 0) {
          bs.timeoutId = setTimeout(
            () =>
              this.tryPrint(() => {
                // 删除扫描监听
                this.btScanners.delete(scanner);
                bs.timeoutId = undefined;
                // 扫描结束
                scanner.onEvent(undefined, true, undefined, undefined);
              }),
            timeout,
          );
        }
        // 开始扫描
        scanner.onEvent(true, undefined, undefined, undefined);
      }
      // 打开扫描操作
      if (!this.btScanning && this.btScanners.size) {
        // 如果没有在扫描就
        // 以微信硬件平台的蓝牙智能灯为例，主服务的 UUID 是 FEE7。传入这个参数，只搜索主服务 UUID 为 FEE7 的设备
        // {
        //   //services: ["0000fff0"],
        //   //name: "ZYK-", // 蓝牙名
        //   //interval: 500,
        // }
        uniProxy
          .invoke(this, 'startBluetoothDevicesDiscovery', {})
          .then((resp) => log.trace('startBluetoothDevicesDiscovery', resp))
          .catch((err) => log.trace('startBluetoothDevicesDiscovery', err));
      }
    }

    /**
     * 停止扫描
     *
     * @param scanner 扫描监听
     */
    stopBtScan(scanner: BtScanner) {
      if (scanner) {
        this.btScanners.delete(scanner);
        clearTimeout((scanner as any).timeoutId);
        // 扫描被取消
        scanner.onEvent(undefined, undefined, true, undefined);
      }
      // 关闭扫描操作
      if (this.btScanners.size <= 0) {
        // 停止扫描
        uniProxy
          .invoke(this, 'stopBluetoothDevicesDiscovery')
          .then((resp) => log.trace('stopBluetoothDevicesDiscovery', resp))
          .catch((err) => log.trace('stopBluetoothDevicesDiscovery', err));
      }
    }

    /**
     * 停止全部的扫描
     */
    stopBtScanAll() {
      if (this.btScanners.size > 0) {
        // 循环取消扫描
        this.btScanners.forEach((scanner) => this.stopBtScan(scanner));
      }
    }

    /**
     * 获取设备的特征值
     *
     * @param deviceId 设备MAC地址
     * @param serviceId 服务UUID
     * @returns 返回特征
     */
    getBleDeviceCharacteristics(deviceId: string, serviceId: string): Promise<UniResponse> {
      return uniProxy.invoke(this, 'getBLEDeviceCharacteristics', {
        deviceId: deviceId,
        serviceId: serviceId,
      });
    }

    /**
     * 初始化WebSocket
     */
    setupWS() {
      if (global && !global.WebSocket) {
        let _this = this;
        class UniWebSocketProxy extends UniWebSocketImpl {
          constructor(url: string | URL, protocols?: string | string[]) {
            super(undefined);
            _this.createWebSocket({ url: url, protocols: protocols }, this);
          }
        }
        global.WebSocket = UniWebSocketProxy;
        utils.tryCatch(() => {
          global.ArrayBuffer = ArrayBuffer;
        }); // 修复MQTT找不到ArrayBuffer
      }
    }

    /**
     * 创建WebSocket，返回 UniWebSocket
     *
     * @returns 返回 promise
     */
    createWebSocket(opts: WsConnectOptions, proxy: UniWebSocket = new UniWebSocketImpl(undefined)): Promise<UniResponse> {
      return new Promise<UniResponse>((resolve, reject) => {
        uniProxy
          .invoke(this, 'connectSocket', opts as any)
          .then((resp) => {
            let socket = resp.value;
            if (socket) {
              proxy.socket = socket;
              let p = proxy as any;
              socket.onOpen((res: any) => utils.applyFn(p.onOpen ? p.onOpen : p.onopen, res));
              socket.onMessage((res: any) => utils.applyFn(p.onMessage ? p.onMessage : p.onmessage, res));
              socket.onError((res: any) => utils.applyFn(p.onError ? p.onError : p.onerror, res));
              socket.onClose((res: any) => utils.applyFn(p.onClose ? p.onClose : p.onclose, res));
              resp.value = proxy;
            }
            resolve(resp);
          })
          .catch((err) => reject(err));
      });
    }
  }

  // ==================================================================================

  /**
   * 拦截器
   */
  export interface InvokeInterceptor {
    /**
     * 调用拦截器
     *
     * @param proxy 代理对象
     * @param target 目标对象
     * @param deviceId 设备ID
     * @param fnName 函数名
     * @param fn uni的函数对象
     * @param wrapPromise 参数
     * @returns 是否拦截此方法的调用
     */
    (proxy: UniProxy, target: any, fnName: string, fn: Function | undefined, wrapPromise: UniPromise): boolean;
  }

  /**
   * uniapp接口的回调
   */
  export interface UniCallback {
    /**
     * 是否请求成功
     */
    successful: boolean;

    /**
     * 成功
     *
     * @param res 消息
     */
    success(res: any): void;

    /**
     * 失败
     *
     * @param err 信息
     */
    fail(err: any): void;

    /**
     * 完成
     */
    complete(): void;
  }

  /**
   * 包装 uni 的 Promise
   */
  export class UniPromise implements UniCallback {
    /**
     * 返回结果
     */
    public value: any;
    /**
     * 是否成功
     */
    public successful: boolean = false;
    /**
     * 是否已完成
     */
    public finish: boolean = false;
    /**
     * 超时ID
     */
    public timeoutId: any;

    constructor(
      public fnName: string,
      public rawArgs: object,
      public resolve: Function = (res: any) => log.trace(`${fnName}.resolve`, res),
      public reject: Function = (err: any) => log.trace(`${fnName}.reject`, err),
      public timeout: number = 2000,
    ) {
      utils.copyAttrs(this.rawArgs, this);
    }

    start() {
      if (!this.timeoutId) {
        if (this.successful) {
          // ignore ...
          return;
        }
        this.timeoutId = setTimeout(() => {
          if (this.successful) {
            this.resolve({});
          } else {
            this.fail(new Error('[2]请求超时: ' + this.fnName));
          }
        }, this.timeout);
      } else {
        throw new Error('禁止重复调用 start 方法');
      }
    }

    success(res: any) {
      clearTimeout(this.timeoutId);
      res.fnName = this.fnName;
      res.value = this.value;
      this.successful = res.errMsg ? (res.errMsg as string).indexOf(':ok') >= 0 : false;
      res.successful = this.successful;
      this.finish = true;
      this.resolve(res);
    }

    fail(err: any) {
      clearTimeout(this.timeoutId);
      this.finish = true;
      try {
        this.reject(err);
      } catch (err) {
        log.warn(`${this.fnName}.uniPromise`, err);
      }
    }

    complete() {
      if (!this.finish) {
        this.success(undefined);
      }
    }
  }

  /**
   * 调用的响应结果
   */
  export interface UniResponse {
    /**
     * 返回结果
     */
    value: any;
    /**
     * 调用的函数铭
     */
    fnName: string;
    /**
     * 错误信息
     */
    errMsg: string;
    /**
     * 结果码
     */
    code?: number;
  }

  /**
   * 回调
   */
  export interface Callback<T> {
    (...args: T[]): void;
  }

  /**
   * 插件响应
   */
  export interface PluginResponse<T> {
    code: number;
    msg: string;
    data: T;
    successful: boolean;
  }

  //============================================================================================
  // window

  /**
   * 屏幕信息
   */
  export interface WindowInfo {
    pixelRatio: number;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    statusBarHeight: number;
    safeArea: Rect;
    safeAreaInsets: Rect;
    windowTop: number;
    windowBottom: number;
    screenTop: number;
  }

  /**
   * 区域范围
   */
  export interface Rect {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
  }

  /**
   * 设备信息
   */
  export interface DeviceInfo {
    brand: string;
    deviceBrand: string;
    deviceModel: string;
    devicePixelRatio: number;
    deviceId: string;
    deviceOrientation: string;
    deviceType: string;
    model: string;
    platform: string;
    system: string;
  }

  //============================================================================================
  // websocket

  /**
   * WebSocket 连接参数
   */
  export interface WsConnectOptions {
    url: string | URL;
    method?: string;
    header?: object;
    protocols?: string | string[];
  }

  /**
   * UNI websocket
   */
  export interface UniWebSocket {
    /**
     * Uni 返回的 SocketTask
     */
    socket?: any;
    /**
     * 打开
     *
     * @param event 事件
     */
    onOpen?(event: any): void;
    /**
     * 接收到消息
     *
     * @param event 事件
     */
    onMessage?(event: MessageEvent<{ data: string | ArrayBuffer | Blob }>): void;
    /**
     * 关闭
     *
     * @param event 事件
     */
    onClose?(event: CloseEvent): void;
    /**
     * 出现错误
     *
     * @param event 事件
     */
    onError?(event: Event): void;
    /**
     * 关闭
     *
     * @param data 数据
     */
    close(code?: number, reason?: string): void;

    /**
     * 发送文本数据
     *
     * @param data 数据
     */
    sendText(data: string): void;

    /**
     * 发送二进制数据
     *
     * @param data 数据
     */
    sendBinary(data: number[] | Array<number> | Uint8Array | Blob | ArrayBufferLike | ArrayBufferView): void;

    /**
     * 发送数据
     *
     * @param data 数据
     * @param dataType 数据类型: string | arraybuffer
     */
    send(data: string | number[] | Array<number> | Uint8Array | Blob | ArrayBufferLike | ArrayBufferView, dataType?: string): void;
  }

  /**
   * UniWebSocket实现
   */
  export class UniWebSocketImpl implements UniWebSocket {
    constructor(public socket: any) {}

    close(code?: number | undefined, reason?: string | undefined): void {
      this.socket.close(code, reason);
    }

    sendText(data: string): void {
      this.send(data, 'string');
    }

    sendBinary(data: Uint8Array | Blob | number[] | ArrayBufferLike | ArrayBufferView): void {
      this.send(data, 'arraybuffer');
    }

    send(data: string | number[] | Array<number> | Uint8Array | Blob | ArrayBufferLike | ArrayBufferView, dataType?: string): void {
      if (dataType) {
        switch (dataType.toLowerCase()) {
          case 'string':
            data = typeof data !== 'string' ? JSON.stringify(data) : data;
            break;
          case 'arraybuffer':
            if (typeof data === 'string') {
              data = binary.strToBytes(data);
            } else {
              if (!(data instanceof Array || data instanceof Uint8Array || data instanceof ArrayBuffer)) {
                throw new Error('不支持的数据类型[String | ArrayBuffer | Uint8Array]: ' + JSON.stringify(data));
              }
            }
            break;
        }
      }
      if (typeof data !== 'string') {
        data = binary.asArrayBuffer(data as any);
      }
      this.socket.send({ data: data });
    }
  }

  //============================================================================================

  // bluetooth api

  /**
   * 名称匹配
   *
   * @param name 名称
   * @param key 关键字
   * @returns  返回匹配结果
   */
  export const nameFilter = (name: string | null, key: string) => name && name.indexOf(key) >= 0;

  /**
   * 拼接完整的UUID
   *
   * @param uuid UUID
   * @returns 返回UUID
   */
  export const bleUUID = (uuid: string) => (uuid && uuid.length == 8 ? uuid + '-0000-1000-8000-00805f9b34fb' : uuid);

  /**
   * 蓝牙设备
   */
  export interface BluetoothDevice {
    /**
     * 蓝牙名
     */
    readonly name: string;
    /**
     * MAC地址
     */
    readonly deviceId: string;
    /**
     * 本地名称
     */
    readonly localName: string;
    /**
     * RSSI
     */
    RSSI?: Number;

    advertisServiceUUIDs?: Array<string>;

    advertisData?: any;
  }

  /**
   * 蓝牙扫描
   */
  export interface BtScanner {
    /**
     * 匹配出符合的设备
     *
     * @param name
     */
    match(device: BluetoothDevice): boolean;

    /**
     * 扫描到设备
     *
     * @param device 设备
     */
    onScanDevice(device: BluetoothDevice): void;

    /**
     * 扫描事件：开始、结束、取消、出现错误
     */
    onEvent(start?: boolean, end?: boolean, cancel?: boolean, error?: Error): void;
  }

  /**
   * UUID
   */
  export interface GattUUID {
    /**
     * 服务的UUID
     */
    service: string;
    /**
     * 监听Service的UUID
     */
    readService: string;
    /**
     * 读取特征的UUID
     */
    readCharacteristic: string;
    /**
     * 读取描述符的UUID
     */
    readDescriptor?: string;
    /**
     * 写入Service的UUID
     */
    writeService?: string;
    /**
     * 写入特征的UUID
     */
    writeCharacteristic?: string;
    /**
     * 写入描述符的UUID
     */
    writeDescriptor?: string;
    /**
     * 通知Service的UUID
     */
    notifyService?: string;
    /**
     * 通知的UUID
     */
    notifyCharacteristic?: string;
    /**
     * 通知特征的描述符UUID
     */
    notifyDescriptor?: string;
    /**
     * MTU：22~512
     */
    mtu: number;
  }

  /**
   * 蓝牙客户端
   */
  export class BluetoothClient<T extends BluetoothClient<T>> {
    /**
     * 是否为debug模式
     */
    debug: boolean = false;
    /**
     * 方法拦截器
     */
    interceptor: InvokeInterceptor = uniProxy.interceptor;
    /**
     * 数据缓冲区，方便解析数据
     */
    readonly buf = new ByteBuf();
    /**
     * 连接的设备
     */
    public _device: BluetoothDevice | any;
    /**
     * 连接状态
     */
    isConnected: boolean = false;
    /**
     * 连接状态：0(未连接)、1(连接中)、2(已连接)、3(自动断开)、4(主动断开)
     */
    state: number = 0;
    /**
     * 发现服务的调度任务
     */
    discoverServiceTimerId: any;
    /**
     * 自动设备状态的调度任务
     */
    autoCheckStatusTimerId: any;
    /**
     * 是否自动连接
     */
    autoConnect: boolean = false;
    /**
     * 监听
     */
    protected readonly listeners: Set<OnBleClientListener<T>> = new Set();

    constructor(public readonly uuid: GattUUID, autoConnect = false) {
      // 初始化蓝牙操作
      uniInstance.setupBt();
      this.autoConnect = autoConnect;
      uuid.readService = utils.getOrDefault(uuid.readService, uuid.service);
      uuid.writeService = utils.getOrDefault(uuid.writeService, uuid.service);
      uuid.notifyService = utils.getOrDefault(uuid.notifyService, uuid.service);
    }

    get device(): BluetoothDevice {
      return this._device;
    }

    /**
     * 添加监听
     *
     * @param listener 监听
     * @returns  返回结果
     */
    addListener(listener: OnBleClientListener<T>): boolean {
      this.listeners.add(listener);
      return true;
    }

    /**
     * 移除监听
     *
     * @param listener 监听
     * @returns  返回结果
     */
    removeListener(listener: OnBleClientListener<T>): boolean {
      this.listeners.delete(listener);
      return false;
    }

    /**
     * 调用监听
     */
    callListenersFn<L extends OnBleClientListener<T>>(cb: (value: L) => void, fnName: string) {
      this.callListeners(cb, (l: any) => l && l[fnName]);
    }

    /**
     * 调用监听
     */
    callListeners<L extends OnBleClientListener<T>>(cb: (value: L) => void, predicate: (listener: OnBleClientListener<T>) => boolean = () => true) {
      this.listeners.forEach((l) => {
        try {
          if (predicate(l)) {
            cb(l as L);
          }
        } catch (err) {
          log.warn(l, err);
        }
      });
    }

    /**
     * 调用 uni 的函数
     *
     * @param fnName 函数名
     * @param args 参数
     * @param requireDevice 是否要求连接到设备
     * @param interceptor 方法拦截器，返回false表示不需要调用
     * @returns 返回 Promise<UniBtDeviceResponse> 的结果
     */
    invoke(fnName: string, args = {}, requiredDevice = true, interceptor?: InvokeInterceptor, timeout?: number, ...options: any): Promise<UniBtDeviceResponse> {
      interceptor = utils.getOrDefault(interceptor, this.interceptor);
      timeout = utils.getOrDefault(timeout, uniProxy.timeout);
      return new Promise<UniBtDeviceResponse>((resolve, reject) => {
        let deviceId = this._device?.deviceId;
        if (requiredDevice && !deviceId) {
          reject('未连接设备');
          return;
        }
        let invokeArgs = deviceId ? utils.copyAttrs(args, { deviceId: deviceId }) : args;
        uniProxy
          .invoke(this, fnName, invokeArgs, interceptor, timeout, options)
          .then((resp) => resolve(utils.copyAttrs(resp, { deviceId: deviceId, requestArgs: args, fnName: fnName })))
          .catch(reject);
      });
    }

    /**
     * 获取设备的服务：UUID列表
     *
     * @returns 返回 Promise<UniBtDeviceResponse>
     */
    getServices(): Promise<UniBtDeviceResponse> {
      return this.invoke('getBLEDeviceServices');
    }

    /**
     * 获取服务的特UUID
     *
     * @param serviceId 服务的UUID
     * @returns 返回结果
     */
    getServiceCharacteristics(serviceId: string): Promise<UniBtDeviceResponse> {
      return this.invoke('getBLEDeviceCharacteristics', { serviceId: serviceId });
    }

    /**
     * 设置MTU，需要在连接成功之后调用
     *
     * @param mtu MTU
     * @returns 返回 Promise<UniBtDeviceResponse>
     */
    setMtu(mtu = 512): Promise<UniBtDeviceResponse> {
      return this.invoke('setBLEMTU', { mtu: mtu });
    }

    /**
     * 连接设备
     *
     * @param device 设备
     * @param timeout 连接超时的时长
     * @returns 返回 Promise<UniResponse>
     */
    reconnect(): Promise<UniBtDeviceResponse> {
      if (this.isConnected) {
        return new Promise((resolve, reject) => reject(new Error('设备已连接，无法重连')));
      }
      if (!this._device) {
        return new Promise((resolve, reject) => reject(new Error('当前不存在需要重连的设备')));
      }
      return this.connect(this._device!!);
    }

    /**
     * 连接设备
     *
     * @param device 设备
     * @param timeout 连接超时的时长
     * @returns 返回 Promise<UniBtDeviceResponse>
     */
    connect(device: BluetoothDevice, timeout = 5000): Promise<UniBtDeviceResponse> {
      timeout = Math.max(timeout, 5000);
      return new Promise<UniBtDeviceResponse>((resolve, reject) => {
        if (!device) {
          reject(new Error('设备不能为空'));
          return;
        }
        if (!this.isConnected) {
          if (this.state == 1) {
            reject(new Error('重在连接中，请稍后重试'));
            return;
          }
          this._device = undefined;
        }
        if (this._device) {
          reject(new Error(`已连接[${this.device?.deviceId}]，无法重复连接！`));
        } else {
          utils.tryCatch(() => uniInstance.openBtAdapter()); // 初始化
          this._device = device;
          let _deviceId = device.deviceId;
          uniInstance.bleClients.set(_deviceId, this);
          this.state = 1;
          this.invoke('createBLEConnection', { timeout: timeout }, false)
            .then((res) => resolve(res))
            .catch((err) => reject(err))
            .finally(() => {
              this.state = this.isConnected ? 2 : 3;
              // 超过3秒未连接就移除
              setTimeout(() => {
                if (!this.isConnected) {
                  uniInstance.bleClients.delete(_deviceId);
                }
              }, 3000);
            });
        }
      });
    }

    /**
     * 断开连接
     *
     * @returns 返回 Promise<any>
     */
    disconnect(deviceId?: string): Promise<UniBtDeviceResponse> {
      // let deviceId = this._device?.deviceId;
      deviceId = deviceId ? deviceId : this._device?.deviceId;
      try {
        return new Promise((resolve, reject) => {
          this.invoke('closeBLEConnection')
            .then((resp) => {
              try {
                if ((resp as any).successful) {
                  this.callListeners<OnBleClientListener<any>>(
                    (l) => l.onDisconnected(this, deviceId!!, false),
                    (l: any) => l && l.onDisconnected,
                  );
                }
              } catch (err) {
                console.error(err);
              } finally {
                resolve(resp);
              }
            })
            .catch(reject);
        });
      } finally {
        if (deviceId) {
          // 移除客户端
          uniInstance.bleClients.delete(deviceId);
        }
        clearInterval(this.autoCheckStatusTimerId);
        clearInterval(this.discoverServiceTimerId);
        this.isConnected = false;
        this.state = 4;
      }
    }

    /**
     * 发送指令
     *
     * @param cmd 指令
     * @returns 返回 Promise<UniBtDeviceResponse> 的结果
     */
    write(cmd: number[] | Array<number> | Uint8Array, timeout: number = uniProxy.timeout): Promise<UniBtDeviceResponse> {
      try {
        this.callListeners(
          (l) => l.onCharacteristicWrite(this as any, (this.device as any).deviceId, cmd),
          (l: any) => l && l.onCharacteristicWrite,
        );
      } finally {
        return this.invoke(
          'writeBLECharacteristicValue',
          {
            serviceId: this.uuid.writeService,
            characteristicId: this.uuid.writeCharacteristic,
            value: cmd,
            //writeType: isIOS() ? 'write' : 'writeNoResponse',
            writeType: 'writeNoResponse',
          },
          true,
          this.interceptor,
          timeout,
        );
      }
    }

    /**
     * 读取
     *
     * @param args 参数
     * @param serviceId 服务UUID
     * @param characteristicId 特征UUID
     * @returns 返回 Promise<UniBtDeviceResponse> 的结果
     */

    read({ serviceId, characteristicId, ...args }: any = {}): Promise<UniBtDeviceResponse> {
      return this.invoke('readBLECharacteristicValue', {
        serviceId: utils.getOrDefault(serviceId, this.uuid.readService),
        characteristicId: utils.getOrDefault(characteristicId, this.uuid.readCharacteristic),
        ...args,
      });
    }

    /**
     * 启动数据监听的通知
     *
     * @param serviceId 服务UUID
     * @param characteristicId 特征UUID
     * @param state 状态：是否启用
     * @returns 返回 Promise<UniBtDeviceResponse> 的结果
     */
    enableNotification({ serviceId, characteristicId, state = true, ...args }: any = {}): Promise<UniBtDeviceResponse> {
      return this.invoke('notifyBLECharacteristicValueChange', {
        serviceId: utils.getOrDefault(serviceId, this.uuid.notifyService),
        characteristicId: utils.getOrDefault(characteristicId, this.uuid.notifyCharacteristic),
        state: utils.getOrDefault(state, true),
        ...args,
      });
    }

    /**
     * 蓝牙状态改变
     *
     * @param msg 消息
     */
    onBtStateChange(msg: UniResponse & { discovering: boolean; available: boolean }) {
      log.trace(`蓝牙状态改变 ==>: `, msg);
      this.callListeners(
        (l) => l.onBtStateChange(this as any, msg),
        (l: any) => l && l.onBtStateChange,
      );
      // 蓝牙适配器不可用
      if (this.isConnected && !msg.available) {
        this.onConnectStatusChange(utils.copyAttrs(msg, { deviceId: this._device!!.deviceId, connected: false }));
      }
    }

    /**
     * 设备连接状态改变
     *
     * @param msg 消息
     */
    onConnectStatusChange(msg: { deviceId: string; connected: boolean } & UniResponse) {
      log.trace(`设备连接状态改变 ==>: ${msg.deviceId}, status: ${msg.connected}, json: ${JSON.stringify(msg)}`);
      this.isConnected = msg.connected;
      (this as any).discoverServiceFlag = false;
      if (msg.connected) {
        this.callListeners(
          (l) => l.onConnected(this as any, msg.deviceId),
          (l: any) => l && l.onConnected,
        );
        // 调用通知
        clearInterval(this.discoverServiceTimerId);
        const localDiscoverServiceTimerId = setInterval(() => {
          if (this.isConnected && !(this as any).discoverServiceFlag) {
            this.getServices()
              .then((resp) => {
                let services: [] = (resp as any).services;
                if ((resp as any).successful && services && services.length > 0) {
                  try {
                    // 设置通知的状态
                    if (this.uuid.notifyCharacteristic) {
                      this.enableNotification();
                    }
                    // 设置MTU
                    if (this.uuid.mtu > 0) {
                      this.setMtu(this.uuid.mtu);
                    }
                    (this as any).discoverServiceFlag = true;
                    // 调用发送service uuid的回调
                    this.callListeners(
                      (l) => l.onServiceDiscover(this as any, msg.deviceId, (resp as any).services),
                      (l: any) => l && l.onServiceDiscover,
                    );
                  } finally {
                    // 清除定时调度
                    clearInterval(this.discoverServiceTimerId);
                    this.discoverServiceTimerId = undefined;
                  }
                }
              })
              .catch(() => {
                /*ignore*/
              });
          } else {
            clearInterval(localDiscoverServiceTimerId);
            // 断开了?
            this.onConnectStatusChange(utils.copyAttrs(msg, { connected: false }));
          }
        }, 500);
        this.discoverServiceTimerId = localDiscoverServiceTimerId;
        // 检查设备的连接状态
        clearInterval(this.autoCheckStatusTimerId);
        const localAutoCheckStatusTimerId = setInterval(() => {
          if (this.isConnected) {
            // 如果处于连接状态，获取当前正在连接的蓝牙设备，如果没有，重置连接状态
            this.getServices()
              .then((resp: any) => {
                if (resp.code && resp.code >= 10000 && resp.code <= 10013) {
                  // 不正常
                  uniInstance.setupBt();
                  uniInstance.openBtAdapter(); // 打开蓝牙适配器
                  this.onConnectStatusChange(utils.copyAttrs(msg, { connected: false }));
                } else {
                  if (resp.successful) {
                    clearInterval(localAutoCheckStatusTimerId);
                  }
                }
              })
              .catch((err) => {
                log.trace('getServices error: ', err);
              });
          } /*  else {
            clearInterval(this.autoCheckStatusTimerId);
          } */
        }, 30_000);
        this.autoCheckStatusTimerId = localAutoCheckStatusTimerId;
      } else {
        // 移除
        uniInstance.bleClients.delete(msg.deviceId);
        this.state = this.state != 0 && this.state != 4 ? 3 : 4; // 自动断开
        clearInterval(this.autoCheckStatusTimerId);
        clearInterval(this.discoverServiceTimerId);
        this.callListeners(
          (l) => l.onDisconnected(this as any, msg.deviceId, this.state == 3),
          (l: any) => l && l.onDisconnected,
        );
      }
    }

    /**
     * 设备状态改变
     *
     * @param msg 消息
     */
    onCharacteristicChange(msg: UniBtDeviceResponse) {
      log.trace(`接收到数据 ==>: ${JSON.stringify(msg)}`);
      this.isConnected = true;
      this.callListeners(
        (l) => l.onCharacteristicChanged(this as any, msg.deviceId, msg.value, msg),
        (l: any) => l && l.onCharacteristicChanged,
      );
    }
  }

  /**
   * 特征数属性
   */
  export interface CharacteristicProperty {
    /**
     * 是否可读
     */
    read: boolean;
    /**
     * 是否读
     */
    write: false;
    /**
     * 是否通知
     */
    notify: false;
    /**
     * 是否显示
     */
    indicate: false;
  }

  /**
   * 蓝牙的UUID
   */
  export interface BtUuid {
    /**
     * UUID
     */
    uuid: string;
    /**
     * 是否为主要的UUID
     */
    isPrimary: boolean;
    /**
     * 特征属性
     */
    properties: CharacteristicProperty;
  }

  /**
   * 监听类
   */
  export interface OnBleClientListener<T extends BluetoothClient<T>> {
    /**
     * 蓝牙状态改变
     *
     * @param client 客户端
     * @param msg 消息
     */
    onBtStateChange(client: T, msg: UniResponse & { discovering: boolean; available: boolean }): void;

    /**
     * 连接成功
     *
     * @param client 客户端
     * @param deviceId 设备MAC地址
     */
    onConnected(client: T, deviceId: string): void;

    /**
     * 发现服务
     *
     * @param client 客户端
     * @param deviceId 设备MAC地址
     * @param services 服务的UUID
     */
    onServiceDiscover(client: T, deviceId: string, services: BtUuid[]): void;

    /**
     * 设备断开
     *
     * @param client 客户端
     * @param deviceId 设备MAC地址
     * @param auto 是否自动断开(如果是，autoConnect 为 true 时会自动重连，否则不自动重连)
     */
    onDisconnected(client: T, deviceId: string, auto: boolean): void;

    /**
     * 设备写入数据
     *
     * @param client 客户端
     * @param deviceId 设备MAC地址
     * @param value 写入的数据
     */
    onCharacteristicWrite(client: T, deviceId: string, value: number[] | Array<number> | Uint8Array): void;

    /**
     * 监听到数据改变
     *
     * @param client 客户端
     * @param deviceId 设备MAC地址
     * @param value 数据
     * @param resp 响应
     */
    onCharacteristicChanged(client: T, deviceId: string, value: number[] | Array<number> | Uint8Array, resp: UniBtDeviceResponse): void;

    /**
     * 监听到错误数据
     *
     * @param client 客户端
     * @param deviceId 设备MAC地址
     * @param err 错误信息
     */
    onError(client: T, deviceId: string, err: Error): void;
  }

  /**
   * 蓝牙适配器状态
   */
  export interface BtAdapterStatus {
    /**
     * 是否正在扫描
     */
    discovering: boolean;
    /**
     * 是否可用
     */
    available: boolean;
  }

  // 0	ok	正常
  // 10000	not init	未初始化蓝牙适配器
  // 10001	not available	当前蓝牙适配器不可用
  // 10002	no device	没有找到指定设备
  // 10003	connection fail	连接失败
  // 10004	no service	没有找到指定服务
  // 10005	no characteristic	没有找到指定特征值
  // 10006	no connection	当前连接已断开
  // 10007	property not support	当前特征值不支持此操作
  // 10008	system error	其余所有系统上报的异常
  // 10009	system not support	Android 系统特有，系统版本低于 4.3 不支持 BLE
  // 10010	already connect	已连接
  // 10011	need pin	配对设备需要配对码
  // 10012	operate time out	连接超时
  // 10013	invalid_data	连接 deviceId 为空或者是格式不正确

  export interface BtCode {
    readonly code: number;
    readonly error: string;
    readonly msg: string;
  }

  export const BT_CODES = <BtCode[]>[
    <BtCode>{ code: 10000, error: 'not init', msg: '蓝牙适配器未初始化' },
    <BtCode>{ code: 10001, error: 'not available', msg: '蓝牙适配器不可用' },
    <BtCode>{ code: 10002, error: 'no device', msg: '没有找到指定设备' },
    <BtCode>{ code: 10003, error: 'connection fail', msg: '连接失败' },
    <BtCode>{ code: 10004, error: 'no service', msg: '没有找到指定服务' },
    <BtCode>{ code: 10005, error: 'no characteristic', msg: '没有找到指定特征值' },
    <BtCode>{ code: 10006, error: 'no connection', msg: '当前连接已断开' },
    <BtCode>{ code: 10007, error: 'property not support', msg: '当前特征值不支持此操作' },
    <BtCode>{ code: 10008, error: 'system error', msg: '其余所有系统上报的异常' },
    <BtCode>{ code: 10009, error: 'system not support', msg: 'Android 系统特有，系统版本低于 4.3 不支持 BLE' },
    <BtCode>{ code: 100010, error: 'already connect', msg: '已连接' },
    <BtCode>{ code: 100011, error: 'need pin', msg: '配对设备需要配对码' },
    <BtCode>{ code: 100012, error: 'operate time out', msg: '连接超时' },
    <BtCode>{ code: 100013, error: 'invalid_data', msg: '连接 deviceId 为空或者是格式不正确' },
  ];

  export const findBtCode = (code?: number) => BT_CODES.find((bt) => bt.code == code);

  /**
   * 蓝牙设备的响应
   */
  export interface UniBtDeviceResponse extends UniResponse {
    deviceId: string;
    serviceId: string;
    characteristicId: string;
    value: Uint8Array;
  }

  /**
   * 同步调用
   */
  export interface SyncCall<Type, Response> {
    /**
     * 发送的指令
     */
    cmd: number[];
    /**
     * 指令类型
     */
    type: Type;
    /**
     * 返回的结果
     */
    data: number[] | Uint8Array;
    /**
     * 超时处理ID
     */
    timerId: any;
    /**
     * 响应
     */
    resp: Response;

    resolve: any;
    reject: any;
    success: any;
  }

  export const uniInstance = new UniInstance();
  utils.tryCatch(() => uniInstance.setupWS()); // 初始化WebSocket操作
  // utils.tryCatch(() => uniInstance.setupBt()); // 初始化蓝牙操作

  let initTimerId: any;
  initTimerId = setInterval(() => {
    if (global.btInitialized) {
      clearInterval(initTimerId);
    } else {
      utils.tryCatch(() => uniInstance.setupBt()); // 初始化蓝牙操作
    }
  }, 1000);

  /**
   * 包装回调，避免空指针
   *
   * @param cb 回调
   * @returns 返回包装的回调
   */
  export function wrapCB<T>(cb?: Callback<T>) {
    return (resp: T) => {
      try {
        if (cb) {
          cb(resp);
        }
      } catch (err) {
        console.error(err);
      }
    };
  }

  /**
   * 调用UNI函数
   *
   * @param fnName 函数名
   * @param args 参数
   * @param callback 回调
   * @returns 返回调用的结果
   */
  export function invokeUniCallback(fnName: string, args: object = {}, callback?: UniCallback) {
    //@ts-ignore
    let fn = uni[fnName];
    if (!fn) {
      let err = new Error('无法发现UNI函数: ' + fnName);
      if (callback && callback.fail) {
        callback.fail(err);
      } else {
        throw err;
      }
    }
    return fn(
      utils.copyAttrs(args, {
        success(resp: any) {
          //console.log(`[${fnName}], resp: ${JSON.stringify(resp)}`);
          if (callback && callback.success) {
            callback.success(resp);
          }
        },
        fail(err: any) {
          //console.error(`[${fnName}], resp: ${JSON.stringify(err)}`);
          console.error(err);
          if (callback && callback.fail) {
            callback.fail(err);
          }
        },
        complete() {
          if (callback && callback.complete) {
            callback.complete();
          }
        },
      }),
    );
  }

  /**
   * 调用UNI函数
   *
   * @param fnName 函数名
   * @param args 参数
   * @param callback 回调
   * @returns 返回调用的结果
   */
  export function invokeUni(fnName: string, args: object = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      var ref = <any>[];
      ref[0] = invokeUniCallback(fnName, args, <UniCallback>{
        success(res) {
          res.value = ref[0];
          resolve(res);
        },
        fail(err) {
          reject(err);
        },
      });
    });
  }

  /**
   * 蓝牙操作
   */
  export const BT = {
    /**
     * 打开蓝牙适配器
     *
     * @returns 返回结果
     */
    openBluetoothAdapter() {
      return invokeUni('openBluetoothAdapter');
    },

    /**
     * 关闭蓝牙适配器
     *
     * @returns 返回结果
     */
    closeBluetoothAdapter() {
      return invokeUni('closeBluetoothAdapter');
    },

    /**
     * 创建连接
     *
     * @param deviceId 设备ID
     * @returns 返回结果
     */
    createBLEConnection(deviceId: string) {
      return invokeUni('createBLEConnection', { deviceId: deviceId });
    },

    /**
     * 关闭连接
     *
     * @param deviceId 设备ID
     * @returns 返回结果
     */
    closeBLEConnection(deviceId: string) {
      return invokeUni('closeBLEConnection', { deviceId: deviceId });
    },

    /**
     * 获取设备
     *
     * @returns 返回结果
     */
    getBluetoothDevices() {
      return invokeUni('getBluetoothDevices', {});
    },

    /**
     * 获取已连接的设备
     *
     * @returns 返回结果
     */
    getConnectedBluetoothDevices() {
      return invokeUni('getConnectedBluetoothDevices', {});
    },
  };

  /**
   * 通过解析"BLE扫描的记录"获取蓝牙的本地名称
   *
   * @param scanRecord BLE扫描的记录
   * @return 蓝牙的本地名称
   */
  export const getLocalName = (scanRecord: number[] | ArrayBuffer | Uint8Array) => {
    scanRecord = binary.asNumberArray(scanRecord);
    if (scanRecord == null || scanRecord.length == 0) return '';
    let localName = '';
    try {
      const DATA_TYPE_LOCAL_NAME_COMPLETE = 0x09;
      const DATA_TYPE_SERVICE_UUID_16_BIT_PARTIAL = 0x02;
      let i = 0;
      while (i < scanRecord.length) {
        if ((scanRecord[i++] & 0xff) == 0) {
          break;
        }
        let len = (scanRecord[i++] & 0xff) - 1;
        let type = scanRecord[i++] & 0xff;
        if (DATA_TYPE_LOCAL_NAME_COMPLETE == type || DATA_TYPE_SERVICE_UUID_16_BIT_PARTIAL == type) {
          let dest = new Array(len);
          binary.arraycopy(scanRecord, i, dest, 0, len);
          localName = binary.bytesToStr(dest, 'UTF-8');
        }
        i += len;
      }
    } catch (ignored) {
      /*^_^*/
    }
    return localName;
  };

  // end :<==
}
