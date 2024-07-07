import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./public/node-ipc"; // 渲染线程调用
import { log } from "./public/log";

// 初始化IPC
import { ElectronRender } from "../libs/electron-render";
import { logger } from "@benefitjs/core";

// 日志
ElectronRender.log.level = logger.Level.debug;

log.info('create vue app ...')

createApp(App)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });

