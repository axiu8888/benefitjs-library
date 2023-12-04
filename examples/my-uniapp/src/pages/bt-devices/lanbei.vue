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
        text="查询状态"
        @click="sendGetStatus"
      ></u-button>
      <u-button
        type="success"
        text="查询版本"
        @click="sendGetVersion"
      ></u-button>
      <u-button type="warning" text="查詢时间" @click="sendGetTime"></u-button>
      <u-button type="success" text="同步时间" @click="sendSetTime"></u-button>
      <u-button
        type="warning"
        text="设置设备ID"
        @click="sendSetDeviceSn"
      ></u-button>
      <span>~~~~</span>
      <u-button
        type="success"
        text="开始采集"
        @click="sendStartCollect"
      ></u-button>
      <u-button
        type="warning"
        text="停止采集"
        @click="sendStopCollect"
      ></u-button>
    </div>
  </view>
</template>

<script lang="ts">
import { binary } from '@benefitjs/core'
import { uniapp } from '@benefitjs/uni-plugins'
import { lanbei } from '../../libs/lanbei'

const uniInstance = uniapp.uniInstance

// 蓝牙血压计
// const client = new lanbeiClient(lanbei.lead1);
const client = new lanbei.Client(lanbei.lead6)
client.addListener(<lanbei.Listener>{
  onBtStateChange(client, msg) {
    console.log(`兰贝设备扫描，状态改变: ${JSON.stringify(msg)}`)
  },
  onConnected(client, deviceId) {
    console.log(`兰贝设备连接[${deviceId}]`)
  },
  onServiceDiscover(client, deviceId, services) {
    console.log(
      `兰贝设备发现服务[${deviceId}], services: ${JSON.stringify(services)}`
    )
  },
  onDisconnected(client, deviceId, auto) {
    console.log(`兰贝设备断开[${deviceId}]`)
  },
  onCharacteristicWrite(client, deviceId, value) {
    // 发送指令
    console.log(
      `发送指令: ${deviceId}, cmd: ${JSON.stringify(
        lanbei.findCmdType(value[1])
      )} value: ${binary.bytesToHex(value)}`
    )
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    console.log(`兰贝设备 接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`)
  },
  onData(client, deviceId, lead, packet) {
    console.log('兰贝设备 接收到数据包: ', lead, packet)
  }
})

const scanner = <uniapp.BtScanner>{
  match(device) {
    return (
      uniapp.nameFilter(device.name, 'ECG-') ||
      uniapp.nameFilter(device.localName, 'ECG-')
    )
  },
  onEvent(start, stop, cancel, error) {
    console.log(
      `start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`
    )
  },
  onScanDevice(device) {
    console.log(device)
    // if ((device.name.includes('ECG-51') && client.leadType == lead1)
    //   || (device.name.includes('ECG-56') && client.leadType == lead6)) {
    //   uniInstance.stopBtScan(this);
    //   setTimeout(() => {
    //     // 连接
    //     client.connect(device)
    //       .then(resp => console.log('连接设备: ' + JSON.stringify(resp)))
    //       .catch(err => console.log(err))
    //   }, 1000);
    // }
    // uniInstance.stopBtScan(this);
    // setTimeout(() => {
    //   // 连接
    //   client.connect(device)
    //     .then(resp => console.log('连接设备: ' + JSON.stringify(resp)))
    //     .catch(err => console.log(err))
    // }, 1000);
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
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    onStartScanClick() {
      uniInstance.startBtScan(0, scanner) // 开始扫描
    },
    onStopScanClick() {
      uniInstance.stopBtScanAll() // 停止全部扫描
    },
    onConnectClick() {
      if (!client.device) {
        const device1 = <uniapp.BluetoothDevice>{
          deviceId: 'B0:10:A0:94:1D:4B',
          name: 'ECG-51000001',
          RSSI: -68,
          localName: 'ECG-51000001',
          advertisServiceUUIDs: []
        }

        const device6 = <uniapp.BluetoothDevice>{
          deviceId: 'B0:10:A0:94:1D:60',
          name: 'ECG-56000001',
          RSSI: -55,
          localName: 'ECG-56000001',
          advertisServiceUUIDs: []
        }
        client
          .connect(client.leadType == lead1 ? device1 : device6)
          .then(resp => console.log(JSON.stringify(resp)))
          .catch(err => console.error(err))
      } else {
        client
          .reconnect()
          .then(resp => console.log(JSON.stringify(resp)))
          .catch(err => console.error(err))
      }
    },
    onDisconnectClick() {
      client
        .disconnect()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendGetStatus() {
      client
        .getStatus()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendGetVersion() {
      client
        .getVersion()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendGetTime() {
      client
        .getTime()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendSetTime() {
      client
        .setTime()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendSetDeviceSn() {
      // client.setDeviceSN('21000001')
      client
        .setDeviceSN(client.leadType == lead1 ? '51000001' : '56000001')
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendStartCollect() {
      client
        .startCollector(5)
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    sendStopCollect() {
      client
        .stopCollector()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    }
  }
}
</script>

<style></style>
