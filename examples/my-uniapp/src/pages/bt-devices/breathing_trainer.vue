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
        type="error"
        text="退出当前模式"
        @click="sendExitCmd"
      ></u-button>
      <u-button
        type="primary"
        text="呼气肌力评估"
        @click="sendExhaleAssessCmd"
      ></u-button>
      <u-button
        type="success"
        text="吸气肌力评估"
        @click="sendInhaleAssessCmd"
      ></u-button>
      <u-button
        type="warning"
        text="呼气肌力训练"
        @click="sendExhaleTrainCmd"
      ></u-button>
      <u-button
        type="primary"
        text="吸气肌力训练"
        @click="sendInhaleTrainCmd"
      ></u-button>
      <u-button
        type="success"
        text="缩唇呼吸训练"
        @click="sendLipGirdleTrainCmd"
      ></u-button>
      <u-button
        type="warning"
        text="阻力+"
        @click="sendResistance(+2)"
      ></u-button>
      <u-button
        type="primary"
        text="阻力-"
        @click="sendResistance(-2)"
      ></u-button>
    </div>
    <span>~~~</span>
    <u-button type="warning" text="清空数据" @click="clearData"></u-button>
    <div>
      <span>~~~</span>
      <div
        v-for="(item, index) in measures"
        :key="index"
        style="font-size: small"
      >
        {{ JSON.stringify(item) }}
      </div>
      <!-- {{ measures }} -->
    </div>
  </view>
</template>

<script lang="ts" setup>
import { ref, watch } from 'vue'

import { binary, utils } from '@benefitjs/core'
import { WisHealth as wh } from '@benefitjs/uni-plugins'

// uniapp.uniProxy.logLevel = uniapp.LogLevel.debug;
const uniInstance = uniapp.uniInstance

const device = ref('暂无')
const title = ref('蓝牙SDK调用')
let measures = ref<Array<{ cmd: string; value: number }>>([])
let latest = <wh.Packet>{}
// 呼吸训练器
const client = new wh.Client()
// const zykClient = new wh.Client(true, true);
// client.debug = true;
// client.requireVerify = false;
client.addListener(<wh.Listener>{
  onBtStateChange(client, msg) {
    console.log(`设备状态改变: ${JSON.stringify(msg)}`)
  },
  onConnected(client, deviceId) {
    console.log('呼吸训练器设备连接: ' + deviceId)
  },
  onDisconnected(client, deviceId, auto) {
    console.log('呼吸训练器设备断开: ' + deviceId)
  },
  onCharacteristicWrite(client, deviceId, value) {
    //console.log(`发送指令: ${binary.bytesToHex(value)}, client.readCmd: ${JSON.stringify(client.readCmd)}`);
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    // console.log('接收到数据['+ deviceId +'] ==>: ' + binary.bytesToHex(value)
    //   , client.readCmd
    //   , client.writeCmd
    // );
  },
  onData(client, data, packet) {
    if (packet) {
      packet.data = undefined
      // 接收到数据
      measures.value.push(packet)
    }

    // console.log(`测量数据(${packet?.validate}) ==>: ` + packet?.maxPressure
    //   , JSON.stringify(packet)
    //   , client.readCmd?.description
    //   , client.writeCmd?.description
    //   , "time: " + utils.dateFmt(packet?.time)
    //   , "data: " + binary.bytesToHex(data)
    //   , "payload: " + binary.bytesToHex(wh.getPayload(data))
    //   );

    console.log(JSON.stringify(packet))
    if (packet.flag == 'end') {
      console.log(measures.value)
    }
  }
})

const zykScanner = <uniapp.BtScanner>{
  match(device) {
    return (
      uniapp.nameFilter(device.name, 'ZYK-') ||
      uniapp.nameFilter(device.localName, 'ZYK-')
    )
  },
  onEvent(start, stop, cancel, error) {
    console.log(
      `start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`
    )
  },
  onScanDevice(device) {
    uniInstance.stopBtScan(this)
    console.log('---------------------------------')
    console.log(device)
    console.log('---------------------------------')
    setTimeout(() => {
      // 连接
      client
        .connect(device)
        .then(resp => console.log('连接设备: ' + JSON.stringify(resp)))
        .catch(err => console.log(err))
    }, 1000)
  }
}

const op = wh.OpType
// console.log(`退出模式: ${binary.bytesToHex(client.cmd(op.write, wh.cmd_exit))}`);
// console.log(`进入呼气肌力评估: ${binary.bytesToHex(client.cmd(op.write, wh.cmd_exhale_assess))}`);
// console.log(`读取吸气肌力评估: ${binary.bytesToHex(client.cmd(op.read, wh.cmd_inhale_assess))}`);
// console.log(`进入呼气肌力训练: ${binary.bytesToHex(client.cmd(op.write, wh.cmd_exhale_train))}`);
// console.log(`读取呼气肌力训练: ${binary.bytesToHex(client.cmd(op.read, wh.cmd_exhale_train))}`);
// console.log(`进入吸气肌力训练: ${binary.bytesToHex(client.cmd(op.write, wh.cmd_inhale_train))}`);
// console.log(`读取吸气肌力训练: ${binary.bytesToHex(client.cmd(op.read, wh.cmd_inhale_train))}`);
// console.log(`进入缩唇肌力呼吸: ${binary.bytesToHex(client.cmd(op.write, wh.cmd_lip_girdle_train))}`);
// console.log(`读取缩唇肌力呼吸: ${binary.bytesToHex(client.cmd(op.read, wh.cmd_lip_girdle_train))}`);

function onOpenBtAdapter() {
  // 打开蓝牙适配器
  uniInstance
    .openBtAdapter()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function onStartScanClick() {
  uniInstance.startBtScan(0, zykScanner) // 开始扫描
}
function onStopScanClick() {
  uniInstance.stopBtScanAll() // 停止全部扫描
}
function onConnectClick() {
  if (!client.device) {
    let device
    device = <uniapp.BluetoothDevice>{
      deviceId: '38:3B:26:1A:3C:B2',
      name: 'ZYK-Z1-01',
      RSSI: -71,
      localName: 'ZYK-Z1-01',
      advertisServiceUUIDs: [],
      advertisData: {}
    }
    // device = <uniapp.BluetoothDevice>{
    //   "deviceId": "38:3B:26:1A:27:5B",
    //   "name": "ZYK-Z1-01",
    //   "RSSI": -70,
    //   "localName": "ZYK-Z1-01",
    //   "advertisServiceUUIDs": [],
    //   "advertisData": {}
    // }
    client
      .connect(device)
      .then(resp => console.log(JSON.stringify(resp)))
      .catch(err => console.error(err))
  } else {
    client
      .reconnect()
      .then(resp => console.log(JSON.stringify(resp)))
      .catch(err => console.error(err))
  }
}
function onDisconnectClick() {
  client
    .disconnect()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function sendExhaleAssessCmd() {
  client
    .sendExhaleAssessCmd()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function sendInhaleAssessCmd() {
  client
    .sendInhaleAssessCmd()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function sendExhaleTrainCmd() {
  client
    .sendExhaleTrainCmd()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function sendInhaleTrainCmd() {
  client
    .sendInhaleTrainCmd()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function sendLipGirdleTrainCmd() {
  client
    .sendLipGirdleTrainCmd()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function sendExitCmd() {
  client
    .sendExitCmd()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}

let resistance = 10
function sendResistance(delta: number = 0) {
  resistance += delta
  client
    .sendResistanceCmd(resistance)
    .then(resp => console.log(`设置阻力($delta), ${JSON.stringify(resp)}`))
    .catch(err => console.error(err))
}

function clearData() {
  measures.value = []
}
</script>

<style></style>
