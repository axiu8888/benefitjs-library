import { binary, logger } from '@benefitjs/core';
import { collector } from '@benefitjs/devices';
import { uniapp } from '../uni/uniapp';
import { udp } from '../uni/udp';
import { bluetooth } from '../uni/bluetooth';

/**
 * 采集器客户端(uni 蓝牙)
 */
export namespace btcollector {
  /**
   * 日志打印
   */
  export const log = logger.newProxy('btcollector', logger.Level.warn);
  /**
   * 解析器
   */
  const parser = collector.parser;

  const device = <uniapp.BluetoothDevice>{
    deviceId: 'C0:66:B5:54:8D:CC',
    name: 'HSRG_11000138',
    RSSI: -40,
    localName: 'HSRG_11000138',
    advertisServiceUUIDs: [],
    advertisData: {},
  };

  /**
   * 采集器设备
   */
  export class Client extends bluetooth.BluetoothClient<Client> {
    /**
     * 采集器设备解析
     */
    readonly collector: collector.Device;
    /**
     * handler
     */
    private readonly _handler = <uniapp.OnBleClientListener<Client>>{
      onConnected(client, deviceId) {
        client.collector.deviceId = client.device!!.name.replace('HSRG_', '').toLocaleLowerCase();
        client.collector.macAddress = deviceId;
      },
      onCharacteristicChanged(client, deviceId, value, resp) {
        // 接收到数据，进行解析
        client.collector.resolve(value);
      },
    };

    /**
     * 采集器客户端的构造函数
     *
     * @param autoConnect 是否自动连接
     * @param useNative 是否使用本地插件(如果支持)
     */
    constructor(autoConnect: boolean = false, useNative = false) {
      super(
        <uniapp.GattUUID>{
          service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
          readCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
          writeCharacteristic: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
          notifyCharacteristic: '6e400003-b5a3-f393-e0a9-e50e24dcca9e',
          mtu: 512,
        },
        autoConnect,
        useNative,
      );
      this.addListener(this._handler); // 处理数据包
      // 采集器设备
      this.collector = new collector.Device({
        onNotify: (deviceId, data, type, packet) => this.onNotify(deviceId, data, type, packet),
        onPacketLost: (deviceId, lost) => this.onPacketLost(deviceId, lost),
      });
    }

    /**
     * 接收到数据
     *
     * @param deviceId 16进制的设备ID
     * @param data 字节数据
     * @param type 数据类型
     * @param packet 实时或重传的数据包 | 血压数据包
     */
    onNotify(deviceId: string, data: number[] | Uint8Array, type: collector.PacketType, packet?: collector.HardwarePacket | collector.BpPacket | undefined): void {
      if (type.data) {
        this.callListeners<Listener>(
          (l) => l.onData(this, deviceId, data, type, packet as collector.HardwarePacket),
          (l) => l && (l as any).onData,
        );
      } else {
        switch (type.type) {
          case collector.packet_blood_pressure_data.type:
          case collector.packet_blood_pressure_measure.type:
            this.callListeners<Listener>(
              (l) => l.onBpData(this, deviceId, data, type, packet as collector.BpPacket),
              (l) => l && (l as any).onBpData,
            );
            break;
          default:
            this.callListeners<Listener>(
              (l) => l.onData(this, deviceId, data, type, packet as any),
              (l) => l && (l as any).onData,
            );
            break;
        }
      }
    }

    /**
     * 丢弃不完整的拼包
     */
    onPacketLost(deviceId: string, lost: collector.JointPacket): void {
      let pkg = lost.pkg0 ? lost.pkg0 : lost.pkg1 ? lost.pkg1 : lost.pkg2 ? lost.pkg2 : lost.pkg3;
      log.warn(
        `【${parser.getDeviceId(pkg)}】检测到丢包: ${parser.getPacketSn(pkg)}, pk0: ${binary.bytesToHex(lost.pkg0)}, pk1: ${binary.bytesToHex(lost.pkg1)}, pk2: ${binary.bytesToHex(
          lost.pkg2,
        )}, pk3: ${binary.bytesToHex(lost.pkg3)}`,
      );
      // 发送一次重传操作
      this.write(collector.retryCmd(deviceId, lost.sn, 1))
        .then((resp) => log.debug(`[${deviceId}] 发送重传指令: ${lost.sn}`, resp))
        .catch((err) => log.warn('发送重传指令出错', err));
    }
  }

  /**
   * 监听
   */
  export interface Listener extends uniapp.OnBleClientListener<Client> {
    /**
     * 接收到数据
     *
     * @param client 客户端
     * @param hexDeviceId 16进制的设备ID
     * @param data 字节数据
     * @param type 数据类型
     * @param packet 实时或重传的数据包
     */
    onData(client: Client, hexDeviceId: string, data: number[] | Uint8Array, type: collector.PacketType, packet?: collector.HardwarePacket): void;

    /**
     * 接收到蓝牙数据
     *
     * @param client 客户端
     * @param hexDeviceId 16进制的设备ID
     * @param data 字节数据
     * @param type 数据类型，仅支持蓝牙的2个类型
     * @param packet 实时或重传的数据包
     */
    onBpData(client: Client, hexDeviceId: string, data: number[] | Uint8Array, type: collector.PacketType, packet?: collector.BpPacket): void;

    /**
     * 接收到超时数据
     *
     * @param client 客户端
     * @param hexDeviceId 16进制的设备ID
     * @param type 数据类型
     * @param jp: 丢弃的拼包数据
     */
    onTimeoutData(client: Client, hexDeviceId: string, type: collector.PacketType, jp: collector.JointPacket): void;
  }

  /**
   * 采集器转发的代理
   */
  export class CollectorRelay implements Listener {
    /**
     * 已经启动的UDP客户端
     */
    private port: number = 0;

    /**
     * 远程服务端地址
     */
    readonly remotes = <Array<string>>[];
    /**
     * 缓存的客户端
     */
    readonly clients = new WeakMap<String, Client>();
    /**
     * 监听
     */
    listener: uniapp.Callback<uniapp.PluginResponse<udp.Message>>;

    /**
     * 采集器 UDP 代理
     *
     * @param addresses 转发的地址
     */
    constructor(...addresses: string[]) {
      this.addRemote(...addresses);
      this.listener = (resp: uniapp.PluginResponse<udp.Message>) => {
        try {
          if (resp.successful && resp.data) {
            this.onUdp(resp.data);
          }
        } catch (err) {
          log.warn('listener', err);
        }
      };
    }

    onData(client: Client, hexDeviceId: string, data: number[] | Uint8Array, type: collector.PacketType, packet?: collector.HardwarePacket | undefined): void {
      try {
        this.clients.set(new String(hexDeviceId), client);
        let _data = binary.asNumberArray(data);
        this.remotes.forEach((addr) => udp.send(this.port, _data, addr, (resp) => {}));
      } catch (err) {
        log.warn('onData', err);
      }
    }

    onBpData(client: Client, hexDeviceId: string, data: number[] | Uint8Array, type: collector.PacketType, packet?: collector.BpPacket | undefined): void {
      try {
        this.clients.set(new String(hexDeviceId), client);
        let _data = binary.asNumberArray(data);
        this.remotes.forEach((addr) => udp.send(this.port, _data, addr));
      } catch (err) {
        log.warn('onBpData', err);
      }
    }

    /**
     * 接收到UDP数据
     *
     * @param msg UDP数据
     */
    onUdp(msg: udp.Message) {
      // 有可能是实时数据反馈
      let deviceId = parser.getDeviceId(msg.data);
      let pkgType = parser.getPacketType(msg.data);
      //log.debug(`[${deviceId}] UDP, remote: ${msg.sender}, type: ${JSON.stringify(pkgType)}, data: ${binary.bytesToHex(msg.data)}`);
      if (pkgType?.type == collector.packet_feedback_realtime.type) {
        return;
      }
      let flag = pkgType?.type !== collector.packet_feedback_realtime.type;
      if (flag) {
        this.clients
          .get(new String(deviceId))
          ?.write(msg.data)
          .then((resp) => log.debug(resp))
          .catch((err) => log.warn(err));
      }
    }

    /**
     * 开启UDP代理服务
     *
     * @param port 启动的UDP端口
     * @returns 返回结果(被启动的端口)
     */
    async start(port = 0) {
      return new Promise<number>((resolve, reject) => {
        if (this.port > 0) {
          resolve(this.port);
          return;
        }
        udp.start(
          port,
          (resp) => {
            if (resp.successful) {
              this.port = resp.data;
              resolve(this.port);
            } else {
              reject('启动UDP转发服务失败: ' + resp.msg);
            }
          },
          this.listener,
        );
      });
    }

    /**
     * 停止UDP代理服务
     */
    async stop() {
      return new Promise<string>((resolve, reject) => {
        let _port = this.port;
        if (_port > 0) {
          udp.stop(_port, (resp) => {
            if (resp.successful) {
              resolve(resp.msg);
            } else {
              reject(resp.msg);
            }
          });
          this.port = 0;
        } else {
          reject('UDP服务未开启');
        }
      });
    }

    /**
     * 添加远程服务端地址
     *
     * @param addresses host:port  => 192.168.1.198:62014
     */
    addRemote(...addresses: string[]) {
      addresses.forEach((addr) => {
        if (!this.remotes.includes(addr)) {
          this.remotes.push(addr);
        }
      });
    }

    /**
     * 移除远程服务端地址
     *
     * @param addresses host:port  => 192.168.1.198:62014
     */
    removeRemote(...addresses: string[]) {
      addresses.forEach((addr) => {
        let index = this.remotes.indexOf(addr);
        if (index >= 0) this.remotes.splice(index, 1);
      });
    }

    onTimeoutData(client: Client, hexDeviceId: string, type: collector.PacketType, jp: collector.JointPacket): void {}
    onBtStateChange(client: Client, msg: uniapp.UniResponse & { discovering: boolean; available: boolean }): void {}
    onConnected(client: Client, deviceId: string): void {}
    onServiceDiscover(client: Client, deviceId: string, services: { uuid: string; isPrimary: boolean }[]): void {}
    onDisconnected(client: Client, deviceId: string): void {}
    onCharacteristicWrite(client: Client, deviceId: string, value: number[] | Uint8Array): void {}
    onCharacteristicChanged(client: Client, deviceId: string, value: number[] | Uint8Array, resp: uniapp.UniBtDeviceResponse): void {}
    onError(client: Client, deviceId: string, err: Error): void {}
  }

  /**
   * 发送重试
   */
  interface SendRetry {
    /**
     * 采集器ID
     */
    deviceId: string;
    /**
     * 类型
     */
    type: collector.PacketType;
    /**
     * 数据
     */
    data: number[];
    /**
     * 远程地址
     */
    remote: string;
    /**
     * 尝试的ID
     */
    delayId: number;
    /**
     * 发送时间
     */
    time: number;
  }
}
