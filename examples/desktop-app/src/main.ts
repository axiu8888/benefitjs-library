import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./public/node-ipc"; // 渲染线程调用
import { log } from "./public/log";

// 初始化IPC
import { ElectronRender } from "../libs/electron-render";

log.info('create vue app ...')

// ElectronRender.ipc.invoke('api', 'ping', { msg: 'Hello World!'})
//   .then(res => log.info(res))
//   .catch(e => log.error(e));

createApp(App)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });

