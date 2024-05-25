import { lstat } from "node:fs/promises";
import { cwd } from "node:process";
import { ipcRenderer } from "electron";
import { log } from "./log";

// 监听消息
ipcRenderer.on("main-process-message", (evt, ...args) => {
  // 渲染线程(浏览中打印日志)
  log.info(`[Receive Main-process message]:`, ...[...args, window]);
});


lstat(cwd())
  .then((stats) => {
    log.info("[fs.lstat]", stats);
  })
  .catch((err) => {
    log.error(err);
  });
