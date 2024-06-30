<template>
  <div>
    <!-- {{  }} -->
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { binary, logger, utils } from "@benefitjs/core";
import { log } from "../public/log";
import { thread } from "../../libs/thread";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "",
    };
  },
  methods: {
    onLoad() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
  },
  onMounted() {
    log.info('onMounted ...');
    // let worker = new Worker("/worker.js");
    let worker = thread.create(function(){
      const child_process = require('child_process');
      console.log(self);
      // console.log(logger);
      // log create()中注入的对象
      logger.global.level = logger.Level.debug;
      self.onmessage = (event) => { log.info('onmessage: ', event); }
      self.onerror = (event) => { log.info('onerror: ', event); }
      self.onabort = (event) => { log.info('onabort: ', event); }

      log.info('process ==>:', process);
      log.info('process.cwd() ==>:', process.cwd());

      child_process.exec('cmd /c chcp 65001 && ipconfig', (err: Error, res: any) => {
        debugger
        log.info('ipconfig ==>: ', err, res);
      });

    });

    setInterval(() => { 
      let date = utils.dateFmt(Date.now());
      log.info('setInterval ==>: ' + date);
      worker.postMessage('render ==>: ' + date);
    }, 5000);

  },
};


</script>

<style></style>
