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
    <u-button type="primary" text="打印..." @click="clickPrint"></u-button>
    <span>~~~~</span>
    <div>
      <u-button
        type="success"
        text="获取主控软件版本"
        @click="sendGetSoftwareVersion"
      ></u-button>
      <u-button
        type="warning"
        text="设置机器音量大小"
        @click="sendSetVoice"
      ></u-button>
      <u-button
        type="success"
        text="设置显示开关"
        @click="sendSetDisplaySwitch"
      ></u-button>
      <u-button type="primary" text="清空记录" @click="sendClear"></u-button>
      <u-button
        type="success"
        text="获取历史记录条数"
        @click="sendGetHistory"
      ></u-button>
      <span>~~~~</span>
      <u-button
        type="primary"
        text="启动测量"
        @click="sendStartMeasure"
      ></u-button>
      <u-button
        type="success"
        text="停止测量"
        @click="sendStopMeasure"
      ></u-button>
    </div>
  </view>
</template>

<script lang="ts">
import { utils, binary } from '@benefitjs/core'
import { uniapp, v3 } from '@benefitjs/uni-plugins'

// 蓝牙血压计
const client = new v3.Client()
client.addListener(<v3.Listener>{
  onBtStateChange(client, msg) {
    console.log(`星脉血压计设备扫描，状态改变: ${JSON.stringify(msg)}`)
  },
  onConnected(client, deviceId) {
    console.log(`星脉血压计连接[${deviceId}]`)
  },
  onServiceDiscover(client, deviceId, services) {
    console.log(
      `星脉血压计发现服务[${deviceId}], services: ${JSON.stringify(services)}`
    )
  },
  onDisconnected(client, deviceId, auto) {
    console.log(`星脉血压计断开[${deviceId}]`)
  },
  onCharacteristicWrite(client, deviceId, value) {
    let cmd = v3.getCmd(value[2])!!
    // 发送指令
    console.log(
      `发送指令: ${deviceId}, cmd: ${
        cmd.description
      } value: ${binary.bytesToHex(value)}`
    )
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    let cmd = v3.getCmd(value[2])!!
    //console.log(`1、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}, cmd: ${JSON.stringify(cmd)}`);
  },
  onData(client, deviceId, value, type, packet) {
    console.log(
      `接收到数据[${deviceId}]: ${binary.bytesToHex(value)}, cmd: ${
        type.description
      }, packet: ${JSON.stringify(packet)}`
    )
  }
})

const scanner = <uniapp.BtScanner>{
  match(device) {
    return (
      uniapp.nameFilter(device.name, 'V03') ||
      uniapp.nameFilter(device.localName, 'V03')
    )
  },
  onEvent(start, stop, cancel, error) {
    console.log(
      `start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`
    )
  },
  onScanDevice(device) {
    uniapp.uniInstance.stopBtScan(this)
    //console.log('---------------------------------');
    console.log(device)
    setTimeout(() => {
      if (client.isConnected) {
        client.sendStartMeasure()
        return
      }
      // 连接
      client
        .connect(device)
        .then(resp => console.log('连接设备: ' + JSON.stringify(resp)))
        .catch(err => console.log(err))
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
      uniapp.uniInstance
        .openBtAdapter()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    onStartScanClick() {
      uniapp.uniInstance.startBtScan(0, scanner) // 开始扫描
    },
    onStopScanClick() {
      uniapp.uniInstance.stopBtScanAll() // 停止全部扫描
    },
    onConnectClick() {
      if (!client.device) {
        client
          .connect(<uniapp.BluetoothDevice>{
            deviceId: 'BA:03:18:77:70:04',
            name: 'V03 ',
            RSSI: -56,
            localName: 'V03\\r\\n',
            advertisServiceUUIDs: ['000003C1-0000-1000-8000-00805F9B34FB'],
            advertisData: {}
          })
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
    sendGetSoftwareVersion() {
      // 获取主控软件版本
      client
        .sendGetSoftwareVersion()
        .then(resp => {
          console.log('获取软件版本: ' + JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    sendSetVoice() {
      client
        .sendSetVoice(5)
        .then(resp => {
          console.log(JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    sendSetDisplaySwitch() {
      client
        .sendSetDisplaySwitch(true)
        .then(resp => {
          console.log(JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    sendClear() {
      client
        .sendClear()
        .then(resp => {
          console.log(JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    sendGetHistory() {
      client
        .sendGetHistory()
        .then(resp => {
          console.log(JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    sendStartMeasure() {
      client
        .sendStartMeasure()
        .then(resp => {
          console.log(JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    sendStopMeasure() {
      client
        .sendStopMeasure()
        .then(resp => {
          console.log(JSON.stringify(resp))
        })
        .catch((err: any) => console.error(err))
    },
    clickPrint() {
      console.log('打印: ' + utils.dateFmt(Date.now()))
    }
  }
}
</script>

<style></style>
