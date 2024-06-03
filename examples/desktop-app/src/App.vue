<template>
  <div id ='app'>
    <h3>{{ title }}</h3>
    <WaveView></WaveView>
    <!-- <holter></holter> -->
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import WaveView from "./components/WaveView.vue";
import holter from "./components/holter.vue";

import { ipcMain, ipcRenderer } from "electron";
import { log } from "./public/log";
import { collector } from "@benefitjs/devices";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    WaveView,
    holter,
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "波形绘制",
    };
  },
  methods: {
    onLoad() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
  },
  onMounted() {
    const app = document.getElementById('app')!!
    log.info('app ==>:', app.style);
  },
};
</script>

<style>
body,
html {
  height: 100%;
  width: 100%;
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
  /* background-color: #EBEEF3 */
}
</style>
