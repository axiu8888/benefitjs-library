import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import "./public/node-ipc";
import { log } from "./public/log";
import { binary } from "@benefitjs/core";

createApp(App)
  .mount("#app")
  .$nextTick(() => {
    postMessage({ payload: "removeLoading" }, "*");
  });

// 打印MD5
log.warn("MD5 =========================>", "af5e0b822d38158e60d36e7cf84d63b4".toUpperCase().match(/.{1,2}/g)?.join(':'));

// const hex = '55 AA 2 1F 11 0 8 80 3 0 18 50 F3 66 52 9 F9 9 F9 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 2 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 55 55 55 55 55 55 55 55 55 55 55 55 5 FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD 55 55 55 55 55 55 55 55 55 55 55 55 5 FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD 55 55 55 55 55 55 55 55 55 55 55 55 5 FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD 55 55 55 55 55 55 55 55 55 55 55 55 5 FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD FD 55 55 55 55 55 55 1 E0 DC DF D6 D6 DC DD E2 E0 DE E0 DD D4 D5 DA DD D9 D2 D2 CF D9 D7 D3 D1 D5 55 55 55 55 55 55 1 AA A8 A4 AA AE B3 B7 B6 B6 B1 A5 8B B6 BC 9B AF A2 AB A7 B1 A8 AA AF AB A8 AA AA AA AA AA AA 2 54 56 57 60 57 4B 4D 4F 5F 5A 5F 82 42 4B 70 48 5F 53 56 58 56 55 56 53 55 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 66 52 9 FA 58 0 2 0 0 0 7D 0 22 0 B6 0 0 0 0 0 0 0 2E 0 0 0 4 64'
//   .split(' ')
//   .map(v => v.length == 1 ? `0${v}` : v)
//   .join('')

// const array = binary.asNumberArray(binary.hexToBytes(hex));
// let sum = 0;
// for (let i = 0; i < 544; i++) {
//   sum = (sum + array[i]) & 0xFF;
// }
// log.info('checkSum ==>:', sum);
// log.info('checkSum ==>:', binary.bytesToHex([sum]));
// log.info('array ==>:', array);
// log.info('hex ==>:', binary.bytesToHex(array));
