<template>
  <div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { binary, logger, utils, thread } from "@benefitjs/core";
import { log } from "../public/log";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
    };
  },
  methods: {
  },
  mounted() {
    log.info('onMounted ...');
    // let worker = new Worker("/worker.js");
    let worker = thread.create(function(){
      log.info(self);

      const child_process = require('child_process');
      logger.global.level = logger.Level.debug;
      self.onmessage = (event) => { 
        log.info('onmessage: ', event);
        // child_process.exec('cmd /c chcp 65001 && ipconfig', (err: Error, res: any) => {
        //   // debugger
        //   log.info('ipconfig ==>: ', err, res);
        // });

        child_process.exec('cmd /c chcp 65001 && java --version', (err: Error, res: any) => { log.info('java --version ==>: ', err, res); })
      }
      self.onerror = (event) => { log.info('onerror: ', event); }
      self.onabort = (event) => { log.info('onabort: ', event); }

      log.info('process ==>:', process);
      log.info('process.cwd() ==>:', process.cwd());

      // child_process.exec('cmd /c chcp 65001 && ipconfig', (err: Error, res: any) => {
      //   // debugger
      //   log.info('ipconfig ==>: ', err, res);
      // });

    });

    this.timerId = setInterval(() => { 
      let date = utils.dateFmt(Date.now());
      log.info('setInterval ==>: ' + date);
      worker.postMessage('render ==>: ' + date);
    }, 5000);
  },
  unmounted() {
    clearInterval(this.timerId)
  },
};


</script>

<style></style>
