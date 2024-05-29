import { utils } from './core';
import { processEnv } from './process-env';

/**
 * 日志打印
 */
export namespace logger {
  /**
   * 日志等级
   */
  export enum Level {
    trace = 0, // console.trace();
    debug = 1, // console.debug();
    log = 2, // console.log();
    info = 3, // console.info();
    warn = 4, // console.warn();
    error = 5, // console.error();
    none = 1000, // print nothing
  }

  /**
   * 日志打印
   */
  export interface Logger {
    /**
     * 允许答应的日志等级
     */
    level: Level;
    /**
     * 默认的tag
     */
    tag: string;

    /**
     * 打印日志 Console.trace(...msg)
     *
     * @param msg 信息
     */
    trace(...msg: any): void;

    /**
     * 打印日志 Console.debug(...msg)
     *
     * @param msg 信息
     */
    debug(...msg: any): void;

    /**
     * 打印日志 Console.log(...msg)
     *
     * @param msg 信息
     */
    log(...msg: any): void;

    /**
     * 打印日志 Console.info(...msg)
     *
     * @param msg 信息
     */
    info(...msg: any): void;

    /**
     * 打印日志 Console.warn(...msg)
     *
     * @param msg 信息
     */
    warn(...msg: any): void;

    /**
     * 打印日志 Console.error(...msg)
     *
     * @param msg 信息
     */
    error(...msg: any): void;
  }

  /**
   * 转换打印信息
   */
  export interface MessageConverter {
    /**
     * @param {level} 日志等级
     * @param {tag}  标签
     * @param {msg}  信息
     */
    (level: string, tag: string, ...msg: any): any;
  }

  /**
   * 全局日志操作
   */
  export interface Global {
    /**
     * 允许打印的日志等级
     */
    level: Level;
    /**
     * 消息转换
     */
    convert: MessageConverter;
    /**
     * 打印函数
     */
    printer: Printer;
    /**
     * 日志打印的实现
     */
    log: Logger;
  }

  /**
   * 全局日志等级
   */
  export const global = <Global>{ level: Level.log };
  /**
   * 检查是否打印日志
   *
   * @param standard 标准
   * @param checked 被检查的等级
   * @returns 返回是否打印
   */
  export const isPrint = (standard: Level, checked: Level) => global.level <= checked && standard <= checked;

  /**
   * 转换打印信息
   *
   * @param tag TAG
   * @param msg 信息
   * @returns 返回转换的信息
   */
  export const converter = (level: string, tag: string, ...msg: any): any => {
    //@ts-ignore
    if (typeof uni !== 'undefined') {
      // 如果是uni环境，输出字符串
      const arr: any[] = [];
      msg.forEach((el: any) => {
        if (el instanceof ArrayBuffer) {
          arr.push(`ArrayBuffer[${ab2hex(el)}]`);
        } else if (Array.isArray(el)) {
          arr.push(`[${el.join(', ')}]`);
        } else if (el instanceof Error) {
          arr.push(`${el.name}[ msg: ${el.message}, stack: ${el.stack} ]`);
        } else if (typeof el == 'object') {
          arr.push(JSON.stringify(el));
        } else {
          arr.push(el);
        }
      });
      return `[${processEnv.getType()}] ${level} [${tag}] ==>: ${arr.join(' ')}`;
    }
    //@ts-ignore
    if ((typeof window == 'undefined' || typeof document == 'undefined') && typeof process !== 'undefined' && process.versions.node) {
      // nodejs环境
      let _date = utils.dateFmt(Date.now(), 'yyyy-MM-dd HH:mm:ss.SSS')
      return [`${_date} [${processEnv.getType()}] ${level} [${tag}] ==>: `, ...msg];
    }
    //@ts-ignore
    if (typeof window !== 'undefined' || typeof document !== 'undefined') {
      // 浏览器环境
      let _date = utils.dateFmt(Date.now(), 'yyyy-MM-dd HH:mm:ss.SSS')
      return [`${_date} [${processEnv.getType()}] ${level} [${tag}] ==>: `, ...msg];
    }
    return [`[${processEnv.getType()}] ${level} [${tag}] ==>: `, ...msg];
  };

  /**
   * 打印函数
   */
  export interface Printer {
    /**
     * 打印
     *
     * @param current 输出等级
     * @param level 当前等级
     * @param tag 标记
     * @param msg 消息
     */
    (current: Level, level: Level, tag: string, ...msg: any): void;
  }

  /**
   * 打印日志
   *
   * @param current 当前等级
   * @param level 输出等级
   * @param tag 标记
   * @param msg 消息
   */
  export const print = <Printer>(current: Level, level: Level, tag: string, ...msg: any) => {
    if (isPrint(level, current)) {
      const info = global.convert(levelTag(current), tag, ...msg);
      if (Array.isArray(info)) {
        consoleFn(current)(...info);
      } else {
        consoleFn(current)(info);
      }
    }
  };

  /**
   * 等级标签
   *
   * @param level 日志等级
   * @returns 返回日志等级的标签
   */
  export const levelTag = (level: Level): string => {
    switch (level) {
      case Level.trace:
        return 'trace';
      case Level.debug:
        return 'debug';
      case Level.log:
        return 'log';
      case Level.info:
        return 'info';
      case Level.warn:
        return 'warn';
      case Level.error:
        return 'error';
      default:
        return '';
    }
  };

  /**
   * 打印函数
   *
   * @param level 日志等级
   * @returns 返回 console 的函数
   */
  export const consoleFn = (level: Level): Function => {
    switch (level) {
      case Level.trace:
        return console.trace;
      case Level.debug:
        return console.debug;
      case Level.log:
        return console.log;
      case Level.info:
        return console.info;
      case Level.warn:
        return console.warn;
      case Level.error:
        return console.error;
      default:
        return console.log;
    }
  };

  /**
   * 日志打印默认实现
   */
  export class SimpleLogger implements Logger {
    constructor(public tag: string, public level: Level = Level.none) {}

    trace(...msg: any): void {
      global.printer(Level.trace, this.level, this.tag, ...msg);
    }

    debug(...msg: any): void {
      global.printer(Level.debug, this.level, this.tag, ...msg);
    }

    log(...msg: any): void {
      global.printer(Level.log, this.level, this.tag, ...msg);
    }

    info(...msg: any): void {
      global.printer(Level.info, this.level, this.tag, ...msg);
    }

    warn(...msg: any): void {
      global.printer(Level.warn, this.level, this.tag, ...msg);
    }

    error(...msg: any): void {
      global.printer(Level.error, this.level, this.tag, ...msg);
    }
  }

  /**
   * 日志代理
   */
  export class LoggerProxy implements Logger {
    constructor(public logger: Logger) {}

    set tag(tag: string) {
      this.logger.tag = tag;
    }

    get tag() {
      return this.logger.tag;
    }

    set level(level: Level) {
      this.logger.level = level;
    }

    get level() {
      return this.logger.level;
    }

    trace(...msg: any): void {
      this.logger.trace(...msg);
    }

    debug(...msg: any): void {
      this.logger.debug(...msg);
    }

    log(...msg: any): void {
      this.logger.log(...msg);
    }

    info(...msg: any): void {
      this.logger.info(...msg);
    }

    warn(...msg: any): void {
      this.logger.warn(...msg);
    }

    error(...msg: any): void {
      this.logger.error(...msg);
    }
  }

  /**
   * 创建日志代理
   *
   * @param log 代理日志
   * @returns 代理
   */
  export const newProxy = (tag: string, level: Level = Level.warn) => new LoggerProxy(new SimpleLogger(tag, level));

  /**
   * ArrayBuffer 转换为16进制
   *
   * @param buffer ArrayBuffer
   * @returns 返回16进制字符串
   */
  const ab2hex = (buffer: ArrayBuffer) => {
    let u8a = new Uint8Array(buffer);
    return Array.prototype.map.call(u8a, (bit) => ('00' + bit.toString(16)).slice(-2)).join('');
  };

  // 全局日志打印
  global.log = newProxy('logger', Level.warn);
  global.convert = converter;
  global.printer = print;
}
