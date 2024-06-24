import { logger } from "@benefitjs/core";

/**
 * 多线程
 */
export namespace thread {
  /**
   * 日志打印
   */
  const log = logger.newProxy('thread', logger.Level.debug);

  /**
   * 创建工作线程
   * 
   * @param f 函数 func.toString()
   * @returns 返回工作线程
   */
  export function createWorker(f: string) {
    let blob = new Blob(['(' + f.toString() + ')()'], { type: 'application/javascript' });
    let url = window.URL.createObjectURL(blob);
    let worker = new Worker(url, { type: 'module' });
    return worker;
  }

  /**
   * 创建 Worker
   */
  export function create() {
    let script = _SCRIPT;//'console.log("hello world!");';
    let workerBlob = new Blob([script], { type: 'application/javascript' });
    let url = URL.createObjectURL(workerBlob);
    return new Worker(url, { type: 'module' });
  }

  const _SCRIPT = `
addEventListener('message', (event) => { console.log('[worker] message =>:', event); });
addEventListener('error', (event) => { console.log('[worker] error =>:', event); });
addEventListener('abort', (event) => { console.log('[worker] abort =>:', event); });
  `

}
