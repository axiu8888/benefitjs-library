<template>
  <div style="width: 100%; height: 100%; background-color: white">
    <div>{{ message }}</div>
    <!-- <WaveView></WaveView> -->

    <h1>Web Bluetooth API</h1>

    <button id="clickme">Test Bluetooth</button>
    <button id="cancel">Cancel Bluetooth Request</button>
    <p>
      Currently selected bluetooth device: <strong id="device-name"></strong>
    </p>

    <!-- <iframe
      :src="url"
      style="width: 120%; height: 900px; background-color: white"
    ></iframe> -->
    <Button @click="onStartScan">开始扫描</Button>
    <Button @click="onCancelScan">取消扫描</Button>
  </div>
</template>

<script lang="ts">
import { Button } from 'ant-design-vue'
import WaveView from './components/WaveView.vue'

import { ipcMain, ipcRenderer } from 'electron'
import { scanner } from './ipc/bluetooth-api'

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    WaveView,
    Button
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      message: '数据...',
      // url: 'https://pr.sensecho.com/monitorReports/physical?reportZid=28f45456bc62485897eb132e54d9ed67&loginName=ywtest&version=undefined&extend=undefined&moduleShow=true',
      url: 'https://pr.sensecho.com/monitorReports/v1/sleepStageAhi?reportZid=94f0e0a2f7de4fa7b936729c2721a698&loginName=ywtest&version=v1&extend=undefined&moduleShow=true&token=eyJhbGciOiJIUzUxMiJ9.eyJqdGkiOiI1Yzk2MGUxMDZhZDc0YWYyOTdiZDljMjgzNWViN2Y1MCIsInVzZXJaaWQiOiIyZDg0OTZjYTMyYWM0NzMyOTgxODI2ZWRiOWM5ZDI4MSIsInN1YiI6Inl3dGVzdCIsIm9yZ1ppZCI6IjZFT3BNNm95cUQiLCJ3YXJkQ29kZSI6IjZFT3BNNm95cUQiLCJwbGF0Zm9ybSI6MCwiaXNzIjoiaHNyZyIsImlhdCI6MTY5ODg0NzkwMiwicmVmcmVzaCI6ZmFsc2UsImV4cCI6MTcwMTQzOTkwMn0.YzAdLS7LcnVGBMJ3n4-QST0ypUQ15_4Vmv4dTM86nglTcNnbGX6AZiLK_hSKPyMb3cMAcOWQluY9fUSEkcRKOg'
    }
  },
  methods: {
    onload() {
      console.log('===========================>')
      console.log('arguments ==>: ')
      console.log(arguments)
      setTimeout(() => ipcRenderer.send('htmlToPdf', this.url), 5000)
    },
    onStartScan(evt: any) {
      scanner.start()
    },
    onCancelScan(evt: any) {
      scanner.stop()
    }
  }
}
</script>

<style>
body,
html {
  height: 100%;
  padding: 0;
  margin: 0;
}

#app {
  /* font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale; */
  width: 100%;
  height: 100%;
  color: #969696;
}
</style>
