<template>
  <div>
    <div>
      <Button hover-class="button-hover" @click="startScan"> 扫描蓝牙</Button>
      <Button hover-class="button-hover" @click="cancelScan"> 取消扫描</Button>
      <Button hover-class="button-hover" @click="disconnect">断开连接</Button>
      <Button hover-class="button-hover" @click="reconnect">重新连接</Button>
      <Button hover-class="button-hover" @click="checkPermission"
        >检查权限</Button
      >
      <Button hover-class="button-hover" @click="sendIpcMain"
        >发送到主进程</Button
      >
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { binary, utils } from "@benefitjs/core";
import { log } from "../public/log";
import { collector } from "@benefitjs/devices";
import { mqtt } from "../public/mqtt";
// import { ElectronMain } from '../../lib/electron-main';//无法引入主进程函数
import { ElectronRender } from "../../lib/electron-render";
import { WebBtCollector } from "../../lib/web-bt-collector";

// 采集器设备
let client: WebBtCollector.Client;
/**
 * 打印日志
 */
const listener = <WebBtCollector.DataListener>{
  onNotify(deviceId, data, type, packet) {
    log.log("onNotify", deviceId, type, packet);
    if (packet) {
      let hp = packet as collector.HardwarePacket;
      if (hp.realtime) {
        mqtt.emitter.emit(`collector/${hp.deviceId}`, hp);
      } else {
        log.warn("接收到其他包", deviceId, type, packet);
      }
    }
  },
  onPacketLost(deviceId, lost) {
    try {
      log.warn("onPacketLost", deviceId, lost);
      // 发送重传指令
      let cmd = collector.retryCmd(binary.hexToBytes(deviceId), lost.sn, 1);
      log.warn("发送重传指令", deviceId, lost.sn, binary.bytesToHex(cmd));
      client
        .writeValueWithoutResponse(cmd)
        .then((res) => log.warn("发送指令结果", res))
        .catch((err) => log.warn("发送指令错误", err));
    } catch (err) {
      log.error(err);
    }
  },
  onConnected(client) {
    log.log("onConnected", client);
  },
  onDisconnected(client) {
    log.log("onDisconnected", client);
    // 清屏
    mqtt.emitter.emit(`collector/${client.device.name.replace("HSRG_", "")}`, {
      clear: true,
    });
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
        ElectronRender.bluetooth
          .getAvailability()
          .then((available: boolean) => {
            if (available) log.info("This device supports Bluetooth!");
            else log.info("Doh! Bluetooth is not supported");
          })
          .catch((err: any) => log.error("getAvailability", err));

        if (ElectronRender.bluetooth.support()) {
          log.info("扫描蓝牙...", collector.uuid);

          ElectronRender.bluetooth
            .startScan(<ElectronRender.bluetooth.ScanOptional>{
              optionalServices: [collector.uuid.service],
              acceptAllDevices: true,
              // filters: [{ namePrefix: 'HSRG' }, { namePrefix: 'Bluetooth BP' }],
            })
            .then((device) => {
              log.warn("扫描到蓝牙设备", device, utils.getProperties(device));
              log.info("device.gatt", device.gatt);

              // 创建采集器
              client = new WebBtCollector.Client(device, listener);
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
            .catch((err) => log.error("蓝牙扫描失败", err));
        }
      } catch (err) {
        log.error(err);
      }
    },
    cancelScan() {
      log.info("取消扫描...");
      // navigator.bluetooth.cancel();
      ElectronRender.bluetooth
        .stopScan()
        .then((res) => log.info("stopScan", res))
        .catch((err) => log.warn("stopScan", err));
    },
    disconnect() {
      if (client) {
        client
          .disconnect()
          .then((res) => log.info("断开设备", client, res))
          .catch((err) => log.error(err));
      } else {
        log.warn("设备未连接...");
      }
    },
    reconnect() {
      // 重新连接
      if (client) {
        client
          .connectAndNotification()
          .then((res) => log.info("重新连接", res))
          .catch((err) => log.warn("重新连接", err));
      } else {
        log.warn("设备未连接...");
      }
    },
    checkPermission() {
      // navigator.permissions.query(<PermissionDescriptor> { name: 'bluetooth' }) // screen-wake-lock
      //   .then(res => {
      //     log.info('navigator.permissions', res);
      //     if (res.state !== "denied") {
      //       // 执行操作
      //     }
      //   })
      //   .catch(err => log.warn('navigator.permissions', err))

      try {
        log.log("是否为渲染进程: ", ElectronRender.isProcess());
      } catch (err) {
        log.error(err);
      }
    },
    sendIpcMain() {
      ElectronRender.ipc
        .invoke('api', "testIpc222", "给主进程发消息: " + utils.dateFmt(Date.now()))
        .then((res) => log.info("testIpc222", res))
        .catch((e) => log.error("testIpc222", e));
    },
  },
  onMounted() {},
};
</script>

<style></style>
