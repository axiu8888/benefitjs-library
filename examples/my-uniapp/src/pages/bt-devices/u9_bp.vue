<!--
 * @Description: 
 * @Date: 2023-05-19 10:13:42
 * @LastEditTime: 2023-05-19 13:29:10
-->
<template>
  <view class="content">
    <div>
      <u-button
        type="primary"
        text="打开蓝牙"
        @click="onOpenBtAdapter"
      ></u-button>
      <u-button
        type="success"
        text="开始扫描"
        @click="onStartScanClick"
      ></u-button>
      <u-button
        type="warning"
        text="停止扫描"
        @click="onStopScanClick"
      ></u-button>
    </div>
    <span>~~~~</span>
    <div>
      <u-button type="success" text="连接" @click="onConnectClick"></u-button>
      <u-button
        type="warning"
        text="断开"
        @click="onDisconnectClick"
      ></u-button>
    </div>
    <span>~~~~</span>
    <div>
      <u-button
        type="primary"
        text="启动测量"
        @click="sendStartMeasure"
      ></u-button>
    </div>
  </view>
</template>

<script lang="ts">
import { log } from '@/libs/log'
import { binary } from '@benefitjs/core'
import { uniapp, u9 } from '@benefitjs/uni-plugins'

const uniInstance = uniapp.uniInstance

// 蓝牙血压计
const client = new u9.Client()
client.addListener(<u9.Listener>{
  onBtStateChange(client, msg) {
    log.debug(`U9血压计设备扫描，状态改变: ${JSON.stringify(msg)}`)
  },
  onConnected(client, deviceId) {
    log.debug(`U9血压计连接[${deviceId}]`)
  },
  onServiceDiscover(client, deviceId, services) {
    log.debug(
      `U9血压计发现服务[${deviceId}], services: ${JSON.stringify(services)}`
    )
  },
  onDisconnected(client, deviceId, auto) {
    log.debug(`U9血压计断开[${deviceId}]`)
  },
  onCharacteristicWrite(client, deviceId, value) {
    // 发送指令
    // log.debug(`发送指令: ${deviceId}, cmd: ${cmd.description} value: ${binary.bytesToHex(value)}`);
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    log.debug(`1、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`)
  },
  onMeasureChange(
    client,
    deviceId,
    value,
    type,
    pressure,
    start,
    fail,
    complete
  ) {
    log.debug(
      `血压状态改变, ${deviceId}, ${binary.bytesToHex(value)}, cmd: ${
        type.description
      }, pressure: ${pressure}, start: ${start}, fail: ${fail}, complete: ${complete}`
    )
  },
  onData(client, deviceId, value, type, packet) {
    log.debug(
      `接收到数据[${deviceId}]: ${binary.bytesToHex(value)}, cmd: ${
        type.description
      }, packet: ${JSON.stringify(packet)}`
    )
  }
})

const scanner = <uniapp.BtScanner>{
  match(device) {
    return (
      uniapp.nameFilter(device.name, 'Bluetooth BP') ||
      uniapp.nameFilter(device.localName, 'Bluetooth BP')
    )
  },
  onEvent(start, stop, cancel, error) {
    log.debug(
      `start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`
    )
  },
  onScanDevice(device) {
    uniInstance.stopBtScan(this)
    //log.debug('---------------------------------');
    log.debug(device)
    setTimeout(() => {
      // 连接
      client
        .connect(device)
        .then(resp => log.debug('连接设备: ' + JSON.stringify(resp)))
        .catch(err => log.debug(err))
    }, 1000)
  }
}

export default {
  data() {
    return {
      device: '暂无',
      title: '蓝牙SDK调用'
    }
  },
  onLoad() {},
  methods: {
    onOpenBtAdapter() {
      // 打开蓝牙适配器
      uniInstance
        .openBtAdapter()
        .then(resp => log.debug(JSON.stringify(resp)))
        .catch(err => log.error(err))
    },
    onStartScanClick() {
      uniInstance.startBtScan(0, scanner) // 开始扫描
    },
    onStopScanClick() {
      uniInstance.stopBtScanAll() // 停止全部扫描
    },
    onConnectClick() {
      if (!client.device) {
        client
          .connect(<uniapp.BluetoothDevice>{
            deviceId: 'F1:F0:01:00:64:FC',
            name: 'Bluetooth BP',
            RSSI: -54,
            localName: 'Bluetooth BP',
            advertisServiceUUIDs: ['0000FFF0-0000-1000-8000-00805F9B34FB'],
            advertisData: {}
          })
          .then(resp => log.debug(JSON.stringify(resp)))
          .catch(err => log.error(err))
      } else {
        client
          .reconnect()
          .then(resp => log.debug(JSON.stringify(resp)))
          .catch(err => log.error(err))
      }
    },
    onDisconnectClick() {
      client
        .disconnect()
        .then(resp => log.debug(JSON.stringify(resp)))
        .catch(err => log.error(err))
    },
    sendStartMeasure() {
      client
        .sendStartMeasure()
        .then(resp => {
          log.debug(JSON.stringify(resp))
        })
        .catch((err: any) => log.error(err))
    }
  }
}
</script>

<style></style>
