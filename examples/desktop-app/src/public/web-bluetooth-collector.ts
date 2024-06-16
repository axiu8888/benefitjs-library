import { binary } from "@benefitjs/core";
import { collector } from "@benefitjs/devices";
import { WebBluetooth } from "./web-bluetooth";

/**
 * 采集器
 */
export namespace WebBluetoothCollector {
  /**
   * 日志打印
   */
  export const log = collector.log;

  // 扫描条件
  // {
  //   optionalServices: [collector.uuid.service],
  //   acceptAllDevices: true,
  //   // filters: [{ namePrefix: 'HSRG' }, { namePrefix: 'Bluetooth BP' }],
  // };

  /**
   * 采集器客户端
   */
  export class Client extends WebBluetooth.Client<Client> {

    /**
     * 数据解析
     */
    readonly resolver: collector.Device;

    /**
     * 创建采集器客户端
     * 
     * @param device 扫描到的蓝牙设备
     * @param listener 数据监听
     */
    constructor(device: WebBluetooth.BluetoothDevice, listener: DataListener = printListener) {
      super(device, collector.uuid);
      this.listeners.push(listener);
      const _self = this;
      this.resolver = new collector.Device(<DataListener> {
        onNotify(hexDeviceId, data, type, packet) {
          _self.listeners.forEach(l => WebBluetooth.apply((l as any).onNotify, hexDeviceId, data, type, packet));
        },
        onPacketLost(deviceId, lost) {
          _self.listeners.forEach(l => WebBluetooth.apply((l as any).onPacketLost, deviceId, lost));
        },
      });
    }

    protected onCharacteristicChanged(...args: any): void {
      super.onCharacteristicChanged(...args);

      try {
        let event = args[0];
        let value = event.target.value as DataView;
        let data = new Uint8Array(value.buffer, 0, value.buffer.byteLength);
        this.resolver.resolve(data);// 解析数据
      } catch (err) {
        log.warn('解析数据错误', err);
      }
    }

  }

  /**
   * 数据监听
   */
  export interface DataListener extends collector.DataListener, WebBluetooth.IGattListener<Client> {
    // 监听
  }

  /**
   * 打印日志
   */
  export const printListener = <DataListener>{
    onNotify(deviceId, data, type, packet) {
      log.log('onNotify', deviceId, type, packet);
    },
    onPacketLost(deviceId, lost) {
      log.warn('onPacketLost', deviceId, lost.sn, lost);
      // 发送重传指令
      let cmd = collector.retryCmd(binary.hexToBytes(deviceId), lost.sn, 1);
      log.log('发送重传指令', deviceId, lost.sn, binary.bytesToHex(cmd));
    },
    onConnected(client) {
      log.log('onConnected', client);
    },
    onDisconnected(client) {
      log.log('onDisconnected', client);
    },
    onCharacteristicChanged(client, event) {
      log.log('onCharacteristicChanged', client, event);
    },
    onCharacteristicWrite(client, value) {
      log.log('onCharacteristicWrite', client, value);
    }
  };

}
