/**
 * HTTP工具
 */
export namespace http {

  /**
   * 发送POST请求，上传文件流
   * 
   * axios.post(url, { file: fs.createReadStream(file) }, { headers: { "Content-Type": "multipart/form-data" }})
   * 
   * @param url 请求路径
   * @param file 文件
   * @returns 返回请求结果
   */
  export function postStream(url: string, file: string) {
    //return axios.post(url, { file: fs.createReadStream(file) }, { headers: { "Content-Type": "multipart/form-data" }})
    throw new Error('demo仅供参考: axios.post(url, { file: fs.createReadStream(file) }, { headers: { "Content-Type": "multipart/form-data" }})');
  }

  /**
   * 对象转换为File
   *
   * @param blobUrl 二进制文件的URL
   * @param filename 文件名
   * @param type 文件类型
   * @returns 返回转换后的File对象
   */
  export function objectURLToBlob(blobUrl: string, httpMethod = 'GET', filename: string = ''): Promise<File> {
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
  }

  /**
   * 将浏览器的内容转换为二进制对象:
   * <!DOCTYPE html>
   *   <body>
   *     <script id="worker" type="app/worker">
   *       addEventListener('message', function () {
   *         postMessage('some message');
   *       }, false);
   *     </script>
   *   </body>
   * </html>
   * 
   * let blob = new Blob([document.querySelector('#worker').textContent]);
   * let url = window.URL.createObjectURL(blob);
   * let worker = new Worker(url);
   * 
   * 
   * @param textContent 文本内容: document.querySelector('#worker').textContent
   * @returns 返回创建的二进制对象
   */
  export function createBlob(textContent: string) {
    let blob = new Blob([textContent]);
    return window.URL.createObjectURL(blob);
  }

  /**
   * 创建工作线程
   * 
   * @param f 函数 func.toString()
   * @returns 返回工作线程
   */
  export function createWorker(f: string) {
    let blob = new Blob(['(' + f.toString() + ')()']);
    let url = window.URL.createObjectURL(blob);
    let worker = new Worker(url);
    return worker;
  }
}


// //------------------------------------------------------------------------------- start
// let worker = new Worker('worker.js');
// worker.onmessage = function (event) {
//   document.getElementById('result').textContent = event.data;
// };
// //------------------------------------------------------------------------------- end


// //------------------------------------------------------------------------------- start
// // worker.js
// // settings
// let num_workers = 10;
// let items_per_worker = 1000000;
// // start the workers
// let result = 0;
// let pending_workers = num_workers;
// for (let i = 0; i < num_workers; i += 1) {
//   let worker = new Worker('core.js');
//   worker.postMessage(i * items_per_worker);
//   worker.postMessage((i + 1) * items_per_worker);
//   worker.onmessage = storeResult;
// }

// // handle the results
// function storeResult(event) {
//   result += event.data;
//   pending_workers -= 1;
//   if (pending_workers <= 0)
//     postMessage(result); // finished!
// }
// //------------------------------------------------------------------------------- end



// //------------------------------------------------------------------------------- start
// // core.js
// let start;
// onmessage = getStart;
// function getStart(event) {
//   start = event.data;
//   onmessage = getEnd;
// }

// let end;
// function getEnd(event) {
//   end = event.data;
//   onmessage = null;
//   work();
// }

// function work() {
//   let result = 0;
//   for (let i = start; i < end; i += 1) {
//     // perform some complex calculation here
//     result += 1;
//   }
//   postMessage(result);
//   close();
// }

// //------------------------------------------------------------------------------- end