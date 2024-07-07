import { logger } from "./logger";

/**
 * 多线程
 * 
 * 需要在 index.html 的<head>标签内添加: worker-src 'self' 'unsafe-inline' * blob:; 
 * 
 * <p>
 * 如: <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline'; worker-src 'self' 'unsafe-inline' * blob:;" />
 * </p>
 */
export namespace thread {
  /**
   * 创建工作线程
   * 
   * @param func 函数 (function(){ 在函数处理业务 }).toString()
   * @returns 返回工作线程
   */
  export function create(func: Function | string, tag = 'worker.js', level = logger.Level.debug) {
    let blob = new Blob([`
    (function(){
      try {
        const logger = require('@benefitjs/core')['logger'];
        // self.logger = logger;
        logger.global.level = ${level};
        self.log = logger.newProxy('${tag}', ${level});
        (${func.toString()})();
      } catch(e) {
        console.error(e);
      }
    })()
    `], { type: 'application/javascript' });
    let url = window.URL.createObjectURL(blob);
    let worker = new Worker(url, { type: 'module' });
    return worker;
  }

}

// 代码 demo =============================================================================
`
let worker = thread.create(function(){
  const core = require('@benefitjs/core');
  // 日志模块
  const logger = core['logger']
  const utils = core['utils']
  /**
   * 日志打印
   */
  const log = logger.newProxy('worker', logger.Level.debug);
  logger.global.level = logger.Level.debug;

  addEventListener('message', (event) => { 
    log.info('[worker] message =>:', event);
    setTimeout(() => self.postMessage('worker send ==>: ' + utils.dateFmt(Date.now())), 1000);
  });
  addEventListener('error', (event) => { log.info('[worker] error =>:', event); });
  addEventListener('abort', (event) => { log.info('[worker] abort =>:', event); });

}.toString());
worker.onmessage = function(event) {
  log.info('onmessage ==>:', event.data);
}
worker.onmessageerror = function(event) {
  log.error('onmessageerror ==>:', event);
}
worker.onerror = function(event) {
  log.error('onerror ==>:', event);
}

setInterval(() => {
  worker.postMessage('render thread =>: 哈哈哈...');
}, 5000);
`
