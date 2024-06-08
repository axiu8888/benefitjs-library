import fs from "fs";
import { logger } from "@benefitjs/core";

/**
 * 文件操作
 */
export namespace files {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("node file", logger.Level.debug);

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
   * @returns 返回创建的路径
   */
  export function mkdir(path: string): string {
    try {
      path = replaceWithCurDir(path);
      fs.mkdirSync(path, { recursive: true });
      return path;
    } catch (err) {
      log.warn(`Failed to create directory: ${path}`, err);
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
   * @returns 返回创建的文件
   */
  export function createFile(path: string): string {
    try {
      if (exist(path)) return path;
      mkdir(getParent(path));
      fs.writeFileSync(path, Buffer.from([]));
      return path;
    } catch (err) {
      log.warn(`Failed to create file: ${path}`, err);
    }
  }
}
