/**
 * HTTP工具
 */
export namespace http {
  /**
   * 对象转换为File
   *
   * @param blobUrl 二进制文件的URL
   * @param filename 文件名
   * @param type 文件类型
   * @returns 返回转换后的File对象
   */
  export const objectURLToBlob = (blobUrl: string, httpMethod = 'GET', filename: string = ''): Promise<File> => {
    return new Promise((resolve, reject) => {
      let http = new XMLHttpRequest();
      http.open(httpMethod, blobUrl, true);
      http.responseType = 'blob';
      http.onload = function (evt) {
        if (this.status == 200 || this.status === 0) {
          let type = this.getResponseHeader('content-type');
          // 在将blob数据转为file
          let files = new window.File([this.response], filename, { type: type ? type : 'arraybuffer' });
          resolve(files);
        } else {
          reject(evt);
        }
      };
      http.send();
    });
  };
}
