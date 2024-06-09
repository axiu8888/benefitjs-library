import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./public/node-ipc";
import { log } from "./public/log";

log.info('create vue app ...')

createApp(App)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });

