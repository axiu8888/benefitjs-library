import { logger } from "@benefitjs/core";
import { collector } from "@benefitjs/devices";
import { WebBluetooth } from "./web-bluetooth";

/**
 * 采集器
 */
export namespace WebBluetoothCollector {
  /**
   * 日志打印
   */
  const log = logger.newProxy("WebBluetoothCollector", logger.Level.debug);

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
      this.resolver = new collector.Device(listener);
      this.listeners.push(listener);
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
  const printListener = <DataListener>{
    onNotify(hexDeviceId, data, type, packet) {
      log.log('onNotify', hexDeviceId, type, packet);
    },
    onPacketLost(lost) {
      log.log('onPacketLost', lost);
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
