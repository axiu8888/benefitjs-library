import fs from "fs";
import { fstat } from "original-fs";

import axios from "axios";
import { logger } from "@benefitjs/core";

/**
 * 上传
 */
export namespace upload {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("upload", logger.Level.debug);

  /**
   * 发送请求
   * 
   * @param url 请求路径
   * @param file 文件
   * @returns 返回请求结果
   */
  export function postStream(url: string, file: string) {
    return axios.post(url, { file: fs.createReadStream(file) }, { headers: { "Content-Type": "multipart/form-data" }})
  }
  
}
