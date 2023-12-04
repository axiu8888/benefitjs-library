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
      <u-button type="primary" text="启动" @click="start"></u-button>
      <u-button type="success" text="暂停" @click="pause"></u-button>
      <u-button type="warning" text="停止" @click="stop"></u-button>
    </div>
    <span>~~~~</span>
    <div>
      <u-button type="primary" text="被动" @click="mode(1)"></u-button>
      <u-button type="success" text="主动" @click="mode(2)"></u-button>
      <u-button type="warning" text="主被动" @click="mode(3)"></u-button>
      <u-button type="success" text="智能主动" @click="mode(4)"></u-button>
    </div>
    <span>~~~~</span>
    <div>
      <u-button type="primary" text="正向" @click="direction(1)"></u-button>
      <u-button type="success" text="反向" @click="direction(2)"></u-button>
    </div>

    <view v-for="(value, key) in packetOption" :key="key">
      {{ key }} - {{ value }}
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { binary, utils, mqtt } from '@benefitjs/core'
import { uniapp, h1 } from '@benefitjs/uni-plugins'
import { sport } from '../../libs/bean'

const uniInstance = uniapp.uniInstance
const device = ref('暂无')
const title = ref('蓝牙SDK调用')
const packetOption = ref<any>({})

const mqttClient = new mqtt.Client(<mqtt.MqttOptions>{
  clientId: mqtt.nextClientId(''),
  autoReconnectInterval: 10,
  host: '192.168.1.198',
  port: 80,
  path: '/support/mqtt',
  userName: 'admin',
  password: 'public'
})

// 连接
mqttClient.connect()

// mqttClient.subscribe(<mqtt.MqttSubscriber>{
//   onMessage(client, topic, msg) {
//   },
// }, '',);

/**
 * 发送运动康复的设备数据（每秒一次）
 *
 * @param orgId 机构ID
 * @param deviceId 设备ID
 * @param msg 运动的采集数据
 */
function sendRecipelRealtime(
  orgId: string,
  deviceId: string,
  msg: sport.MqttMessage
) {
  mqttClient.publish(
    `/recipel/sportRecovery/${orgId}/${deviceId}`,
    JSON.stringify(msg)
  )
}

/**
 * 发送设备的实时数据
 *
 * @param orgId 机构ID
 * @param personZid 患者ID
 * @param msg 设备采集的实时数据
 */
function sendDeviceRealtime(orgId: string, personZid: string, msg: sport.Body) {
  mqttClient.publish(`/sport/device/${orgId}/${personZid}`, JSON.stringify(msg))
}
let body = <sport.Body>{
  personZid: '',
  deviceId: '11000138',
  mac: '',
  itemType: '智能电动训练车',
  bleName: '',
  points: []
}
// 蓝牙血压计
const client = new h1.Client(true, true)
client.addListener(<h1.Listener>{
  onConnected(client, deviceId) {
    console.log(`连接[${deviceId}]`)
  },
  onServiceDiscover(client, deviceId, services) {
    console.log(`发现服务[${deviceId}], services: ${JSON.stringify(services)}`)

    // 发送默认参数
    setTimeout(() => client.sendConfCmd(h1_opts), 50)
  },
  onDisconnected(client, deviceId, auto) {
    console.log(`断开[${deviceId}]`)
  },
  onCharacteristicWrite(client, deviceId, value) {
    // 发送指令
    // console.log(`发送指令: ${deviceId}, cmd: ${cmd.description} value: ${binary.bytesToHex(value)}`);
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    //console.log(`1、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`);
  },

  onData(client, deviceId, value, packet) {
    console.log(
      `2、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`,
      packet
    )

    packetOption.value = packet

    body.points.push(<sport.Point>{
      personZid: body.personZid,
      deviceId: body.deviceId,
      time: Date.now(),
      mac: deviceId,
      itemType: body.itemType,
      stage: 'execute', // 执行阶段：准备、运动、恢复
      resistanceGears: packet.resistance,
      speed: packet.speed,
      rotateSpeed: packet.speed,
      duration: packet.countDown,
      distance: packet.mileage
    })
    sendDeviceRealtime('', body.personZid, body)
  }
})

const scanner = <uniapp.BtScanner>{
  match(device) {
    return (
      uniapp.nameFilter(device.name, 'Fourier H1') ||
      uniapp.nameFilter(device.localName, 'Fourier H1')
    )
  },
  onEvent(start, stop, cancel, error) {
    console.log(
      `start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`
    )
  },
  onScanDevice(device) {
    uniInstance.stopBtScan(this)
    //console.log('---------------------------------');
    console.log(device)
    setTimeout(() => {
      // 连接
      client
        .connect(device)
        .then(resp => console.log('连接设备: ' + JSON.stringify(resp)))
        .catch(err => console.log(err))
    }, 1000)
  }
}

const h1_opts = <h1.Options>{
  mode: 1, // 模式：被动1 主动2 智能被动3 智能主动4
  turnOn: 2, // 暂停1 非暂停2 停止3(进入暂停状态并清除累积的里程和时间)
  direction: 1, // 方向 正向1 反向2
  duration: 5, // 设定工作时间min，1-255
  speed: 20, // 设定速度r/min 1-60
  spasmLevel: 6, // 设定痉挛等级 1-12
  resistanceOn: 2, // 智能阻力是否开启 关闭1 开启2
  resistance: 1 // 设定阻力等级 1-12
  //trainType: 0x00, // 训练类型：当前的设置训练类型 上肢垂直交叉0x00，上肢水平训练0x01，上肢垂直平行0x02，下肢0x10
}

utils.copyAttrs(
  {
    mode: 1,
    turnOn: 3,
    direction: 1,
    duration: 1,
    speed: 1,
    spasmLevel: 6,
    resistanceOn: 1,
    resistance: 1
  },
  h1_opts
)

function onOpenBtAdapter() {
  // 打开蓝牙适配器
  uniInstance
    .openBtAdapter()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function onStartScanClick() {
  uniInstance.startBtScan(0, scanner) // 开始扫描
}
function onStopScanClick() {
  uniInstance.stopBtScanAll() // 停止全部扫描
}
function onConnectClick() {
  if (!client.device) {
    client
      .connect(<uniapp.BluetoothDevice>{
        deviceId: '00:1B:10:4F:3A:2E',
        name: 'Fourier H1',
        RSSI: -58,
        localName: 'Fourier H1',
        advertisServiceUUIDs: [],
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
}
function onDisconnectClick() {
  client
    .disconnect()
    .then(resp => console.log(JSON.stringify(resp)))
    .catch(err => console.error(err))
}
function start() {
  client.sendConfCmd(utils.copyAttrs(<h1.Options>{ turnOn: 2 }, h1_opts))
  uni.showToast({
    title: '开始...',
    icon: 'success'
  })
}
function pause() {
  client.sendConfCmd(utils.copyAttrs(<h1.Options>{ turnOn: 1 }, h1_opts))
  uni.showToast({
    title: '暂停...',
    icon: 'success'
  })
}

function stop() {
  client.sendConfCmd(utils.copyAttrs(<h1.Options>{ turnOn: 3 }, h1_opts))
  uni.showToast({
    title: '停止...',
    icon: 'success'
  })
}
function mode(type: number) {
  client.sendConfCmd(utils.copyAttrs(<h1.Options>{ mode: type }, h1_opts))
  uni.showToast({
    title: '切换模式: ' + h1.modeName(h1_opts.mode),
    icon: 'success'
  })
}
function direction(type: number) {
  client.sendConfCmd(utils.copyAttrs(<h1.Options>{ direction: type }, h1_opts))
  uni.showToast({
    title: '切换方向: ' + (h1_opts.direction == 1 ? '正' : '反'),
    icon: 'success'
  })
}
</script>

<style></style>
