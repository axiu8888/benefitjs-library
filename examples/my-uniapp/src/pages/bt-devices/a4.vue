<!--
 * @Description: 
 * @Date: 2023-05-19 10:13:42
 * @LastEditTime: 2023-05-19 13:29:10
-->
<template>
  <view class="content">
    <div>
      <u-button type="primary" text="打开蓝牙" @click="onOpenBtAdapter"></u-button>
      <u-button type="success" text="开始扫描" @click="onStartScanClick"></u-button>
      <u-button type="warning" text="停止扫描" @click="onStopScanClick"></u-button>
    </div>
    <span>~~~~</span>
    <div>
      <u-button type="success" text="连接" @click="onConnectClick"></u-button>
      <u-button type="warning" text="断开" @click="onDisconnectClick"></u-button>
    </div>
    <span>~~~~</span>
    <div>
      <u-button type="primary" text="启动" @click="start"></u-button>
      <u-button type="success" text="暂停" @click="pause"></u-button>
      <u-button type="warning" text="停止" @click="stop"></u-button>
    </div>

    <view v-for="(value, key) in packetOption" :key="key">
      {{ key }} - {{ JSON.stringify(value) }}
    </view>

  </view>
</template>
  
<script lang="ts" setup>

import { ref } from 'vue'
import { binary, utils } from '@benefitjs/core';
import { uniapp, a4 } from '@benefitjs/uni-plugins';
import { log } from '@/libs/log';

const uniInstance = uniapp.uniInstance;
const device = ref('暂无')
const title = ref('蓝牙SDK调用')
const packetOption = ref<any>({})

const a422 = uniapp.requireNativePlugin('A4Module');


// 蓝牙血压计
// const client = new a4.Client(true, true);
const client = new a4.Client();
client.addListener(<a4.Listener>{
  onConnected(client, deviceId) {
    log.debug(`连接[${deviceId}]`, client.device);
    uni.showToast({
      title: '连接: ' + deviceId + ", useNative: " + client.useNative,
      // icon: 'success'
    })
  },
  onServiceDiscover(client, deviceId, services) {
    log.debug(`发现服务[${deviceId}], services: ${JSON.stringify(services)}`);
    log.debug('services ==>: ', (client as any).rawServices);
  },
  onDisconnected(client, deviceId, auto) {
    log.debug(`断开[${deviceId}], auto: ${auto}`);
    uni.showToast({
      title: '断开连接: ' + deviceId,
      // icon: 'success'
    })
  },
  onCharacteristicWrite(client, deviceId, value) {
    // 发送指令
    // log.debug(`发送指令: ${deviceId}, cmd: ${cmd.description} value: ${binary.bytesToHex(value)}`);
  },
  onCharacteristicChanged(client, deviceId, value, resp) {
    log.debug(`1、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`);
  },

  onData(client, deviceId, value, packet) {
    log.debug(`2、接收到数据[${deviceId}]: ${binary.bytesToHex(value)}`, packet);

    packetOption.value = packet
  },
});


const scanner = <uniapp.BtScanner>{
  match(device) {
    return device.name.startsWith('A4-');
  },
  onEvent(start, stop, cancel, error) {
    log.debug(`start: ${start}, stop: ${stop}, cancel: ${cancel}, error: ${error}`);
  },
  onScanDevice(device) {
    uniInstance.stopBtScan(this);
    //log.debug('---------------------------------');
    log.debug(device);
    setTimeout(() => {
      // // 连接
      // client.connect(device)
      //   .then(resp => log.debug('连接设备: ' + JSON.stringify(resp)))
      //   .catch(err => log.debug(err))
      a422.startConnection({macAddress: device.deviceId}, resp => {
        log.debug('resp +=>: ' + resp)
      })
    }, 1000);
  },
};

function onOpenBtAdapter() {
  // 打开蓝牙适配器
  uniInstance.openBtAdapter()
    .then(resp => log.debug(JSON.stringify(resp)))
    .catch(err => log.error(err));
}
function onStartScanClick() {
  uniInstance.startBtScan(0, scanner); // 开始扫描
}
function onStopScanClick() {
  uniInstance.stopBtScanAll(); // 停止全部扫描
}
function onConnectClick() {
  if (!client.device) {
    client.connect(<uniapp.BluetoothDevice>{
      "deviceId": "E0:E2:E6:0F:49:3E",
      "name": "A4-;Jm7",
      "RSSI": -67,
      "localName": "A4-;Jm7",
      "advertisServiceUUIDs": []
    })
      .then(resp => log.debug(JSON.stringify(resp)))
      .catch(err => log.error(err));
  } else {
    client.reconnect()
      .then(resp => log.debug(JSON.stringify(resp)))
      .catch(err => log.error(err));
  }
}
function onDisconnectClick() {
  client.disconnect()
    .then(resp => log.debug(JSON.stringify(resp)))
    .catch(err => log.error(err));
}
function start() {
  // client.send(2)
  //   .then(resp => log.debug(JSON.stringify(resp)))
  //   .catch(err => log.error(err));
  // uni.showToast({
  //   title: '开始...',
  //   icon: 'success'
  // })
  a422.start()
}
function pause() {
  // client.send(3)
  //   .then(resp => log.debug(JSON.stringify(resp)))
  //   .catch(err => log.error(err));
  // uni.showToast({
  //   title: '暂停...',
  //   icon: 'success'
  // })
  a422.pause()
}

function stop() {
  client.send(4)
    .then(resp => log.debug(JSON.stringify(resp)))
    .catch(err => log.error(err));
  uni.showToast({
    title: '停止...',
    icon: 'success'
  })
}
</script>
  
<style></style>
  