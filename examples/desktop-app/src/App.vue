<template>
  <div style="width: 100%; height: 100%; background-color: white">
    <h3>{{ title }}</h3>
    <WaveView></WaveView>

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
import { collector } from "@benefitjs/devices";
import { io } from "socket.io-client";

// const socket = io("http://localhost:4000/ws/event");
// // client-side
// socket.on("connect", () => {
//   log.info('connect', socket.id); // x8WIv7-mJelg7on_ALbx
// });

// socket.on("message", (msg) => {
//   log.info('message', socket.id, msg); // undefined
// });
// socket.on("disconnect", () => {
//   log.info('disconnect', socket.id); // undefined
// });

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    WaveView,
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "波形绘制",
    };
  },
  methods: {
    onload() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
    onStartScan(evt: any) {
      //@ts-ignore
      navigator.bluetooth
        .requestDevice({
          acceptAllDevices: true,
          // filters: [
          //   { services: [collector.uuid.service] },
          //   { name: "HSRG_11000923" },
          //   { namePrefix: "Prefix" },
          // ],
        })
        .catch((err: any) => log.error(err));
    },
    onCancelScan(evt: any) {
      //@ts-ignore
      navigator.bluetooth.cancel();
    },
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
