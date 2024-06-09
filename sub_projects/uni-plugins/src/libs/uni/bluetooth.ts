import { binary, logger } from '@benefitjs/core';
import { uniapp } from './uniapp';

/**
 * UNI蓝牙
 */
export namespace bluetooth {
  /**
   * 日志打印
   */
  export const log = logger.newProxy('bluetooth', logger.Level.warn);

  /**
   * 蓝牙插件
   */
  export const native = uniapp.requireNativePlugin('ble');

  /**
   * 是否支持插件
   */
  export function support(): boolean {
    try {
      return native.support && native.support();
    } catch (err) {
      return false;
    }
  }

  /**
   * 获取连接中的设备信息
   */
  export function connectingDevices() {
    return native.invokePlugin('connectingDevices');
  }

  /**
   * 检查设备是否连接
   */
  export function isConnected(mac: string) {
    return native.invokePlugin('isConnected', { mac: mac });
  }

  /**
   * 连接设备
   *
   * @param args 参数
   * @param callback 回调
   * @param listener 监听(接收数据和状态)
   * @returns 返回结果(空)
   */
  export function connect(args: ConnectOptions, callback: uniapp.Callback<uniapp.PluginResponse<any>>, listener: uniapp.Callback<uniapp.PluginResponse<BlePluginMessage>>) {
    return native.invokePlugin('connect', args, callback, listener);
  }

  /**
   * 设备重连
   *
   * @param args 参数
   * @param callback 回调
   * @returns 返回结果(空)
   */
  export function reconnect(mac: string, callback: uniapp.Callback<uniapp.PluginResponse<any>>) {
    return native.invokePlugin('reconnect', { mac: mac }, callback);
  }

  /**
   * 设置客户端的UUID
   *
   * @param mac MAC地址
   * @param uuid 设置的UUID
   * @param callback 结果回调
   * @returns 返回结果(空)
   */
  export function setUuid(mac: string, uuid: uniapp.GattUUID, callback: uniapp.Callback<uniapp.PluginResponse<any>>) {
    return native.invokePlugin('uuid', { mac: mac, uuid: uuid }, callback);
  }

  /**
   * 断开连接
   *
   * @param args 参数
   * @param callback 回调
   * @returns 返回结果(空)
   */
  export function disconnect(mac: string, callback: uniapp.Callback<uniapp.PluginResponse<any>>) {
    return native.invokePlugin('disconnect', { mac: mac }, callback);
  }

  /**
   * 写入(给设备发送指令)
   *
   * @param args 参数
   * @param data 指令(16进制)
   * @param callback 回调
   * @returns 返回结果(空)
   */
  export function write(mac: string, data: string, callback: uniapp.Callback<uniapp.PluginResponse<any>>) {
    return native.invokePlugin('write', { mac: mac, data: data }, callback);
  }

  /**
   * 连接参数
   */
  export interface ConnectOptions {
    /**
     * MAC地址
     */
    mac: string;
    /**
     * 是否自动连接
     */
    autoConnect: boolean;
    /**
     * 是否强制连接
     */
    force: boolean;
    /**
     * 连接超时
     */
    timeout: number;
    /**
     * 操作的UUID(读、写、通知)
     */
    uuid: uniapp.GattUUID;
  }

  /**
   * 蓝牙客户端
   */
  export class BluetoothClient<T extends BluetoothClient<T>> extends uniapp.BluetoothClient<T> {
    /**
     * 删除处理器
     */
    private readonly _nativeHandler = (msg: BlePluginMessage) => this._intervalNativeHandler(msg);
    /**
     *  是否使用插件
     */
    useNative: boolean;

    constructor(uuid: uniapp.GattUUID, autoConnect: boolean = false, useNative: boolean = support()) {
      super(uuid, autoConnect);
      this.useNative = useNative;
    }

    /**
     * 处理插件消息
     *
     * @param msg 插件消息处理
     */
    private _intervalNativeHandler(msg: BlePluginMessage) {
      try {
        log.debug('_intervalNativeHandler ==>: ', msg);
        let _this = this as any;
        // onFailure、onBtStateChange、onConnected、onDisconnected、onServicesDiscovered、onCharacteristicRead、onCharacteristicWrite、onCharacteristicChanged、onMtuChanged
        switch (msg.type) {
          case 'onFailure':
            super.callListenersFn<uniapp.OnBleClientListener<T>>((l) => l.onError(_this, msg.mac, new Error(msg.error)), 'onError');
            break;
          case 'onBtStateChange':
            let state = (msg as any).state;
            let stateMsg = <{ discovering: boolean; available: boolean }>{ discovering: false, available: state == 'ON' };
            super.callListenersFn<uniapp.OnBleClientListener<T>>((l) => l.onBtStateChange(_this, stateMsg as any), 'onBtStateChange');
            break;
          case 'onConnected':
            super.isConnected = true;
            super.callListenersFn<uniapp.OnBleClientListener<T>>((l) => l.onConnected(_this, msg.mac), 'onConnected');
            break;
          case 'onDisconnected':
            super.isConnected = false;
            super.callListenersFn<uniapp.OnBleClientListener<T>>((l) => l.onDisconnected(_this, msg.mac, msg.auto), 'onDisconnected');
            break;
          case 'onServicesDiscovered':
            super.isConnected = true;
            let services = msg.services.map((s) => <uniapp.BtUuid>{ isPrimary: s.isPrimary, uuid: s.serviceId });
            _this.rawServices = msg.services;
            _this.services = services;
            super.callListenersFn<uniapp.OnBleClientListener<T>>((l) => l.onServiceDiscover(_this, msg.mac, services), 'onServiceDiscover');
            break;
          case 'onCharacteristicRead':
            // 暂不支持
            break;
          case 'onCharacteristicWrite':
            super.callListenersFn<uniapp.OnBleClientListener<T>>((l) => l.onCharacteristicWrite(_this, msg.mac, binary.hexToBytes(msg.value)), 'onCharacteristicWrite');
            break;
          case 'onCharacteristicChanged':
            super.isConnected = true;
            super.callListenersFn<uniapp.OnBleClientListener<T>>(
              (l) => l.onCharacteristicChanged(_this, msg.mac, binary.hexToBytes(msg.value), undefined as any),
              'onCharacteristicChanged',
            );
            break;
          case 'onMtuChanged':
            // 暂不支持
            break;
        }
      } catch (err) {
        console.error(err);
      }
    }

    connect(device: uniapp.BluetoothDevice, timeout?: number): Promise<uniapp.UniBtDeviceResponse> {
      if (!this.useNative) {
        return super.connect(device, timeout);
      }
      return new Promise<uniapp.UniBtDeviceResponse>((resolve, reject) => {
        super._device = device;
        let mac = device.deviceId;
        let args = <ConnectOptions>{ mac: mac, autoConnect: this.autoConnect, timeout: timeout, force: true, uuid: this.uuid };
        bluetooth
          .connect(
            args,
            (resp) => {
              //console.log(`[${mac}] connect: ${JSON.stringify(args)}, autoConnect: ${this.autoConnect}, resp: ${JSON.stringify(resp)}`);
              if (resp.successful) {
                // 连接成功
              } else {
                // 连接失败
                console.warn('连接失败: ' + resp.msg);
              }
            },
            this._nativeHandler as any,
          )
          .then((resp) => resolve(resp as any))
          .catch(reject);
      });
    }

    disconnect(): Promise<uniapp.UniBtDeviceResponse> {
      if (!this.useNative) {
        return super.disconnect();
      }
      return new Promise<uniapp.UniBtDeviceResponse>((resolve, reject) => {
        let mac = this.device!!.deviceId;
        bluetooth
          .disconnect(mac, (resp) => {
            //console.log(`[${mac}] disconnect, resp: ${JSON.stringify(resp)}`);
          })
          .then((resp) => resolve(resp as any))
          .catch(reject);
      });
    }

    reconnect(): Promise<uniapp.UniBtDeviceResponse> {
      if (!(this.useNative && support())) {
        return super.reconnect();
      }
      return new Promise<uniapp.UniBtDeviceResponse>((resolve, reject) => {
        if (!this.device) {
          reject(new Error('未发现连接过的设备'));
          return;
        }
        let mac = this.device!!.deviceId;
        bluetooth
          .reconnect(mac, (resp) => {
            //console.log(`[${mac}] reconnect, resp: ${JSON.stringify(resp)}`);
            if (!resp.successful) {
              this.connect(this.device!!)
                .then((resp) => resolve(resp as any))
                .catch(reject);
            }
          })
          .then((resp) => resolve(resp as any))
          .catch(reject);
      });
    }

    write(cmd: Uint8Array | number[], timeout?: number): Promise<uniapp.UniBtDeviceResponse> {
      if (!(this.useNative && support())) {
        return super.write(cmd, timeout);
      }
      return new Promise<uniapp.UniBtDeviceResponse>((resolve, reject) => {
        let mac = this.device!!.deviceId;
        let data = binary.bytesToHex(cmd);
        bluetooth
          .write(mac, data, (resp) => {
            resolve(resp as any);
            //console.log(`[${mac}] write data: ${data}, resp: ${JSON.stringify(resp)}`);
          })
          .then((resp) => {})
          .catch(reject);
      });
    }

    read({ serviceId, characteristicId, ...args }: any): Promise<uniapp.UniBtDeviceResponse> {
      if (!(this.useNative && support())) {
        return super.read({ serviceId, characteristicId, ...args });
      }
      throw new Error('不支持的操作');
    }

    setMtu(mtu?: number): Promise<uniapp.UniBtDeviceResponse> {
      if (!(this.useNative && support())) {
        return super.setMtu(mtu);
      }
      throw new Error('不支持的操作');
    }
  }

  /**
   * 插件消息
   */
  export interface BlePluginMessage {
    /**
     * MAC地址
     */
    mac: string;
    /**
     * 设备
     */
    device: uniapp.BluetoothDevice;
    /**
     * 类型：onFailure、onBtStateChange、onConnected、onDisconnected、onServicesDiscovered、onCharacteristicRead、onCharacteristicWrite、onCharacteristicChanged、onMtuChanged
     */
    type: string;
    /**
     * 错误提示
     */
    error: string;
    /**
     * 是否为自动连接
     */
    autoConnect: boolean;
    /**
     * 是否为自动断开连接
     */
    auto: boolean;
    /**
     * 服务和特征值的UUID
     */
    services: ServiceUUID[];
    /**
     * 服务的UUID
     */
    serviceId: string;
    /**
     * 特征的UUID
     */
    characteristicId: string;
    /**
     * 值
     */
    value: string;
    /**
     * MTU
     */
    mtu: number;
    /**
     * 状态
     */
    status: number;
  }

  export interface ServiceUUID {
    serviceId: string;
    isPrimary: boolean;
    characteristics: CharacteristicUUID[];
  }

  export interface CharacteristicUUID {
    characteristicId: string;
    properties: string[];
    permissions: string[];
    writeType: string;
    descriptors: string[];
  }
}
