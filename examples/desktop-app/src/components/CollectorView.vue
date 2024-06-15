<template>
  <div>
    <div>
      <Button hover-class="button-hover" @click="startScan"> 扫描蓝牙 </Button>
      <Button hover-class="button-hover" @click="cancelScan"> 取消扫描 </Button>
      <Button hover-class="button-hover" @click="disconnect">断开连接</Button>
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { utils } from "@benefitjs/core";
import { log } from "../public/log";
import { collector } from "@benefitjs/devices";
import { WebBluetooth } from "../public/web-bluetooth";
import { WebBluetoothCollector } from "../public/web-bluetooth-collector";
import { mqtt } from '../public/mqtt';

// 采集器设备
let client: WebBluetoothCollector.Client;
/**
 * 打印日志
 */
const listener = <WebBluetoothCollector.DataListener>{
  onNotify(hexDeviceId, data, type, packet) {
    log.log("onNotify", hexDeviceId, type, packet);
    if(packet) {
      let hp = packet as collector.HardwarePacket;
      mqtt.emitter.emit(`collector/${hp.deviceId}`, hp);
    }
  },
  onPacketLost(lost) {
    log.log("onPacketLost", lost);
  },
  onConnected(client) {
    log.log("onConnected", client);
  },
  onDisconnected(client) {
    log.log("onDisconnected", client);
  },
  onCharacteristicChanged(client, event) {
    //log.log("onCharacteristicChanged", client, event);
  },
  onCharacteristicWrite(client, value) {
    log.log("onCharacteristicWrite", client, value);
  },
};

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "",
    };
  },
  methods: {
    onLoad() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
    startScan() {
      try {
        //@ts-ignore
        WebBluetooth
          .getAvailability()
          .then((available: boolean) => {
            if (available) log.info("This device supports Bluetooth!");
            else log.info("Doh! Bluetooth is not supported");

            if (available) {
              log.info("扫描蓝牙...", collector.uuid);

              WebBluetooth.startScan(<WebBluetooth.ScanOptional>{
                optionalServices: [collector.uuid.service],
                acceptAllDevices: true,
                // filters: [{ namePrefix: 'HSRG' }, { namePrefix: 'Bluetooth BP' }],
              })
                .then(device => {
                  log.warn("扫描到蓝牙设备", device, utils.getProperties(device));
                  log.info("device.gatt", device.gatt);

                  // 创建采集器
                  client = new WebBluetoothCollector.Client(device, listener);
                  // 连接设备
                  client
                    .connectAndNotification()
                    .then((res) => {
                      log.warn("connectAndNotification", res);
                      try {
                        res
                          .getDescriptors()
                          .then((res) => log.warn("getDescriptors", res))
                          .catch((err) => log.error("getDescriptors", err));
                      } catch (err) {
                        log.error(err);
                      }
                    })
                    .catch((err) => log.error("connectAndNotification", err));
                })
                .catch(err => log.error('蓝牙扫描失败', err));

              // //@ts-ignore
              // navigator.bluetooth
              //   .requestDevice({
              //     optionalServices: [collector.uuid.service],
              //     acceptAllDevices: true,
              //     // filters: [{ namePrefix: 'HSRG' }, { namePrefix: 'Bluetooth BP' }],
              //   })
              //   .then((device: WebBluetooth.BluetoothDevice) => {
              //     log.info('requestDevice', device);
              //   })
              //   .catch((err: any) => log.error("requestDevice", err));
            }
          })
          .catch((err: any) => log.error(err));
      } catch (err) {
        log.error(err);
      }
    },
    cancelScan() {
      log.info("取消扫描...");
      // navigator.bluetooth.cancel();
    },
    disconnect() {
      client
        .disconnect()
        .then((res) => log.info("断开设备", client, res))
        .catch((err) => log.error(err));
    },
  },
  onMounted() {},
};
</script>

<style></style>
