import { lstat } from "node:fs/promises";
import { cwd } from "node:process";
import { ipcRenderer } from "electron";
import { log } from "./log";

// 初始化IPC
import { ElectronRender } from "../../lib/electron-render";

// 监听消息
ipcRenderer.on("main-process-message", (event, ...args) => {
  // 渲染线程(浏览中打印日志)
  log.info(`[Receive Main-process message]:`, event, ...[...args, window]);
});

ElectronRender.ipc.invoke('api', 'testIpc111', 'ping...')
  .then(res => log.warn('testIpc111', res))
  .catch(e => log.warn('testIpc111', e));


lstat(cwd())
  .then((stats) => {
    log.info("[fs.lstat]", stats);
  })
  .catch((err) => {
    log.error(err);
  });
