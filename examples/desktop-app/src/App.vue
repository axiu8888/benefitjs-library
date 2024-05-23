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
    <Button @click="onConnect">连接设备</Button>
    <Button @click="onDisconnect">断开设备</Button>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import WaveView from "./components/WaveView.vue";

import { ipcMain, ipcRenderer } from "electron";
import { log } from "./public/log";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    WaveView,
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      message: "数据...",
      // url: 'https://pr.sensecho.com/monitorReports/physical?reportZid=28f45456bc62485897eb132e54d9ed67&loginName=ywtest&version=undefined&extend=undefined&moduleShow=true',
      url: "https://pr.sensecho.com/monitorReports/physical?reportZid=3111c6935b9f48eab1d39836feb48927&loginName=ywtest&version=undefined&extend=undefined&moduleShow=true",
    };
  },
  methods: {
    onload() {
      log.info("arguments ==>: ", arguments);
      setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
    onStartScan(evt: any) {
      //@ts-ignore
      navigator.bluetooth
        .requestDevice({
          acceptAllDevices: true,
          //     filters: [
          //       { services: [collector.uuid.service] },
          //       { name: 'HSRG_11000923' },
          //       { namePrefix: 'Prefix' }
          //     ]
        })
        .catch((err: any) => {
          log.error(err);
        });
    },
    onCancelScan(evt: any) {},
    onConnect() {},
    onDisconnect() {},
  },
};
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
