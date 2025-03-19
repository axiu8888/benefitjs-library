<template>
  <div>
    <h2>瑞超小肺</h2>

    <div>
      <button
        hover-class="button-hover"
        @click="connect"
      >
        连接
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { binary, logger, utils, connector } from "@benefitjs/core";
import { log } from "../public/log";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "",
      ws: WebSocket,
    };
  },
  methods: {
    onLoad() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
    connect() {
      let ws = new WebSocket('ws://192.168.9.101:8089');
      ws.onopen = (ev) => { log.info('onopen', ev); }
      ws.onmessage = (ev) => { log.info('onmessage', ev); }
      ws.onclose = (ev) => { log.info('onclose', ev); }
      ws.onerror = (ev) => { log.info('onerror', ev); }
      this.ws = ws;
      
      let autoConnector = new connector.AutoConnector(<connector.Connection> {
        isConnected() { return ws.readyState === ws.OPEN },
        doConnect: () => {
          // 待连接
        },
      });
      //autoConnector.start()

    },
  },
  onMounted() {
    log.info('onMounted ...');
  },
};


</script>

<style></style>
