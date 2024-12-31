import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./public/node-ipc"; // 渲染线程调用
import { log } from "./public/log";

// 初始化IPC
import { ElectronRender } from "../libs/electron-render";
import { binary, logger } from "@benefitjs/core";

// 日志
ElectronRender.log.level = logger.Level.debug;

log.info('create vue app ...')

createApp(App)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });

const crypto = require('crypto');
function generateMD5(input) {
  log.info('crypto:', crypto);
  let v = crypto.createHash('md5').update(input)
  log.info('md5 digest:', v);
  let hex = v.digest('hex');
  log.info('hexToNumber: ', binary.hexToNumber(hex));
  return hex;
}
log.info("MD5 Hash:", generateMD5("example"));
