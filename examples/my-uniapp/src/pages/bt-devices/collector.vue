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
        text="开始采集器插件"
        @click="startBtConnector"
      ></u-button>
      <u-button
        type="success"
        text="停止采集器插件"
        @click="stopBtConnector"
      ></u-button>
      <u-button
        type="primary"
        text="是否支持插件"
        @click="supportNative"
      ></u-button>
    </div>
    <span>~~~~</span>
    <div></div>

    <Ecg></Ecg>
  </view>
</template>

<script lang="ts">
import WaveForm from './wave-form/wave-form-render.vue'
import Ecg from '../../libs/waveview/ecg.vue'
import { uniapp, bluetooth, btcollector as btc } from '@benefitjs/uni-plugins'
import { log } from '@/libs/log'
import { utils } from '@benefitjs/core'

// 采集器
const client = new btc.Client(true, true)
client.addListener(<btc.Listener>{
  onBtStateChange(client, msg) {
    log.debug(`采集器设备扫描，状态改变: ${JSON.stringify(msg)}`)
  },
  onConnected(client, deviceId) {
    log.debug('采集器连接', deviceId, client.device)
  },
  onDisconnected(client, deviceId, auto) {
    log.debug('采集器断开', deviceId, client.device, auto)
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    //log.debug(`1、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`);
  },
  onData(client, hexDeviceId, data, type, packet) {
    log.debug(
      `2、接收到数据[${hexDeviceId}], type: ${type.name}, sn: ${packet?.packetSn}, time: ${packet ? utils.dateFmt(packet.time!! * 1000) : ''}, data[${data.length}]`
    )
  },
  onBpData(client, hexDeviceId, data, type, packet) {
    log.debug(`3、接收到血压数据, ${hexDeviceId}, type: ${type}, packet: ${JSON.stringify(packet)}`)
  }
})

/* , 'research.sensecho.com:62014' */
// const relay = new btc.CollectorRelay('192.168.1.198:62014', '192.168.1.198:7014');
const relay = new btc.CollectorRelay('192.168.1.198:62014')
relay.start(6123)
client.addListener(relay) //转发的代理

const uniInstance = uniapp.uniInstance

const scanner = <uniapp.BtScanner>{
  match(device) {
    return device.name.startsWith('HSRG_11') || device.name.startsWith('HSRG_16')
  },
  onEvent(start, stop, cancel, error) {
    log.debug(`start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`)
  },
  onScanDevice(device) {
    //log.debug('---------------------------------');
    log.debug(device)
    uniInstance.stopBtScan(this)
    setTimeout(() => {
      // 连接
      client
        .connect(device)
        .then(resp => log.debug('连接设备: ' + JSON.stringify(resp)))
        .catch(err => log.debug(err))
    }, 1000)
  }
}

const btcollector = uniapp.requireNativePlugin('btcollector')

export default {
  components: {
    WaveForm,
    Ecg
  },
  data() {
    return {
      device: '暂无',
      title: '蓝牙SDK调用',
      chartData: {
        hr_list: ''
      }
    }
  },
  onReady() {},
  onLoad() {
    log.debug('onLoad', this)

    setTimeout(() => {
      const ctx = uni.createCanvasContext('canvas22', this)
      log.debug('-------------------ctx')
      log.debug(ctx)
      log.debug('-------------------ctx')

      // Draw coordinates
      ctx.arc(100, 75, 50, 0, 2 * Math.PI)
      ctx.setFillStyle('#EEEEEE')
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(40, 75)
      ctx.lineTo(160, 75)
      ctx.moveTo(100, 15)
      ctx.lineTo(100, 135)
      ctx.setStrokeStyle('#AAAAAA')
      ctx.stroke()

      ctx.setFontSize(12)
      ctx.setFillStyle('black')
      ctx.fillText('0', 165, 78)
      ctx.fillText('0.5*PI', 83, 145)
      ctx.fillText('1*PI', 15, 78)
      ctx.fillText('1.5*PI', 83, 10)

      // Draw points
      ctx.beginPath()
      ctx.arc(100, 75, 2, 0, 2 * Math.PI)
      ctx.setFillStyle('lightgreen')
      ctx.fill()

      ctx.beginPath()
      ctx.arc(100, 25, 2, 0, 2 * Math.PI)
      ctx.setFillStyle('blue')
      ctx.fill()

      ctx.beginPath()
      ctx.arc(150, 75, 2, 0, 2 * Math.PI)
      ctx.setFillStyle('red')
      ctx.fill()

      // Draw arc
      ctx.beginPath()
      ctx.arc(100, 75, 50, 0, 1.5 * Math.PI)
      ctx.setStrokeStyle('#333333')
      ctx.stroke()

      ctx.draw()

      log.debug('绘制。。。')
    }, 1000)
  },
  onMounted() {},
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
        let device
        device = <uniapp.BluetoothDevice>{
          deviceId: 'C0:66:B5:54:8D:CC',
          name: 'HSRG_11000138',
          RSSI: -33,
          localName: 'HSRG_11000138',
          advertisServiceUUIDs: [],
          advertisData: {}
        }
        client
          .connect(device)
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
    sendTimeCalibration() {},
    supportNative() {
      log.debug('ble.support: ' + bluetooth.native.support())
    },

    startBtConnector() {
      let opts = {
        mac: 'C0:66:B5:54:8D:CC',
        remote: '192.168.1.198:62014',
        resolve: true, // 解析的数据
        notify: false // 原始数据
      }
      btcollector.connect(opts, resp => {
        //log.debug('采集器插件数据: ', resp);
        if (resp.packet && resp.packet.realtime) {
          log.debug(
            resp.packet.packetSn +
              ' ==>: ' +
              JSON.stringify(resp.packet.ecgList)
          )
          this.chartData.hr_list = JSON.stringify(resp.packet.ecgList)
        }
      })
      log.debug(
        'btcollector.support: ' + JSON.stringify(btcollector.getMethods())
      )
    },
    stopBtConnector() {
      btcollector.disconnect({ mac: 'C0:66:B5:54:8D:CC' })
      log.debug(
        'btcollector.support: ' + JSON.stringify(btcollector.getMethods())
      )
    },
    eventHandler() {}
  }
}
</script>

<style>
.line-center {
  text-align: center;
}

.ecg-view {
  position: relative;
  left: 0px;
  top: 0px;
  margin: 3px;
  background: #111111;
  border: thin solid #aaaaaa;
}

.bg-grid {
  position: fixed;
  left: 0px;
  top: 0px;
  margin: 4px;
  border: thin solid #aaaaaa;
}
</style>
