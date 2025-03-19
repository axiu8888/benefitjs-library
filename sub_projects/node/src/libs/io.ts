import fs from 'fs';
import { logger } from "@benefitjs/core";

/**
 * IO操作(文件)
 */
export namespace io {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("IO", logger.Level.warn);

  /**
   * 替换路径的双斜杠和双反斜杠
   *
   * @param path 路径
   * @returns 返回替换后的路径
   */
  export function replace(path: string) {
    return path ? path.replaceAll("\\", "/").replace("//", "/") : "";
  }

  /**
   * 替换路径的双斜杠和双反斜杠
   *
   * @param path 路径
   * @returns 返回替换后的路径
   */
  export function replaceWithCurDir(path: string) {
    path = replace(path);
    path = path.startsWith("./") ? `${curDir()}${path.substring(1)}` : path;
    path = replace(path);
    return path;
  }

  /**
   * 获取当前上下文目录
   */
  export function curDir() {
    return process.cwd();
  }

  /**
   * 判断文件或目录是否存在
   *
   * @param path 路径
   * @returns 返回是否存在
   */
  export function exist(path: string): boolean {
    return fs.existsSync(path);
  }

  /**
   * 创建目录
   *
   * @param path 路径
   * @param throwError 是否抛出异常
   * @returns 返回创建的路径
   */
  export function mkdir(path: string, recursive: boolean = true, throwError: boolean = false): string {
    try {
      path = replaceWithCurDir(path);
      fs.mkdirSync(path, { recursive: recursive });
      return path;
    } catch (err) {
      log.warn(`Failed to create directory: ${path}`, err);
      if(throwError) throw err;
      else return path;
    }
  }

  /**
   * 获取当前文件的父目录
   *
   * @param path 路径
   */
  export function getParent(path: string): string {
    path = replaceWithCurDir(path);
    let lastAt = path.lastIndexOf("/");
    return lastAt > 0 ? path.substring(0, lastAt) : "";
  }

  /**
   * 创建文件
   *
   * @param path 文件路径
   * @param throwError 是否抛出异常
   * @returns 返回创建的文件
   */
  export function createFile(path: string, throwError: boolean = false): string {
    try {
      path = replaceWithCurDir(path);
      if (exist(path)) return path;
      mkdir(getParent(path));
      fs.writeFileSync(path, Buffer.from([]));
      return path;
    } catch (err) {
      log.warn(`Failed to create file: ${path}`, err);
      if(throwError) throw err;
      else return path;
    }
  }

  /**
   * 写入文件
   * 
   * @param file 文件
   * @param data 数据
   * @param append 是否追加
   */
  export function write(file: string, data: string | Buffer, append: boolean = false, mode: string = 'utf8') {
    return new Promise<boolean>((resolve, reject) => {
      fs.writeFile(file, data, { flag: append ? 'a+' : 'rw+', mode: data instanceof String ? mode : undefined  }, (err) => {
        if (err) reject(err);
        else resolve(true);
      });
    });
  }

  /**
   * 写入二进制数据
   * 
   * @param file 文件
   * @param callback 回调
   */
  export function writeStream(file: string, buf: any, callback: Function) {
    let wstream = fs.createWriteStream(file);
    wstream.write(buf);
    wstream.end();
    wstream.on('finish', () => callback());
    wstream.on('error', (err) => callback(err));
  }

  /**
   * 读取二进制数据
   * 
   * @param file 文件
   * @param callback 回调
   */
  export function readStream(file: string, callback: Function) {
    const rstream = fs.createReadStream(file);
    let chunks: any[] = [];
    let size = 0;
    rstream.on('readable', function () {
      let chunk = rstream.read();
      if (chunk != null) {
        chunks.push(chunk);
        size += chunk.length;
      }
    });
    rstream.on('end', () => callback(null, Buffer.concat(chunks, size)));
    rstream.on('error', (err) => callback(err, null));
  }

}
