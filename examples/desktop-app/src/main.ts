import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./public/node-ipc";
import { log } from "./public/log";

createApp(App)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });

// 打印MD5
log.warn("MD5 =========================>", "af5e0b822d38158e60d36e7cf84d63b4".toUpperCase().match(/.{1,2}/g)?.join(':'));
