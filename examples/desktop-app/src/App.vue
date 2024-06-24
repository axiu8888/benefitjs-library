<template>
  <div id="app">
    <h3>{{ title }}</h3>
    <CollectorView></CollectorView>

    <!-- <qrcode></qrcode> -->
    <WaveView></WaveView>
    <!-- <holter></holter> -->
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import WaveView from "./components/WaveView.vue";
import holter from "./components/holter.vue";
import qrcode from "./components/qrcode.vue";
import CollectorView from "./components/CollectorView.vue";

import { log } from "./public/log";
import { thread } from "../libs/thread";

log.info('Vue create ...');

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    WaveView,
    holter,
    qrcode,
    CollectorView,
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
    const app = document.getElementById("app")!!;
    log.info("app ==>:", app.style);
  },
};

// let worker = new Worker("/worker.js");
// let worker = thread.create();
let worker = thread.createWorker(function(){
  // 日志模块
  const logger = require('@benefitjs/core')['logger']
  /**
   * 日志打印
   */
  const log = logger.newProxy('worker', logger.Level.debug);
  logger.global.level = logger.Level.debug;

  addEventListener('message', (event) => { log.info('[worker] message =>:', event); });
  addEventListener('error', (event) => { log.info('[worker] error =>:', event); });
  addEventListener('abort', (event) => { log.info('[worker] abort =>:', event); });
}.toString());
worker.onmessage = function(event) {
  log.info('onmessage ==>:', event.data);
}
worker.onmessageerror = function(event) {
  log.error('onmessageerror ==>:', event);
}
worker.onerror = function(event) {
  log.error('onerror ==>:', event);
}

setInterval(() => {
  worker.postMessage('render thread =>: 哈哈哈...');
}, 5000);

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
