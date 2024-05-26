// import { SerialPort } from "serialport";
// import { PortInfo } from "@serialport/bindings-interface";
// import { logger } from "@benefitjs/core";

// // 文档接口: https://serialport.io/docs/
// // 代码: https://github.com/serialport/node-serialport

// /**
//  * 串口
//  */
// export namespace serialport {
//   /**
//    * 日志打印
//    */
//   export const log = logger.newProxy("serialport", logger.Level.warn);

//   /**
//    * 列出所有串口设备
//    */
//   export const list = () => SerialPort.list();

//   /**
//    * 状态
//    */
//   export enum State {
//     /**
//      * USB插上
//      */
//     attach,
//     /**
//      * USB移除
//      */
//     detach,
//     /**
//      * 已存在
//      */
//     exist,
//   }

//   /**
//    * 过滤器
//    */
//   export interface Filter {
//     /**
//      * 过滤
//      *
//      * @param port 端口
//      */
//     (port: PortInfo): void;
//   }

//   /**
//    * 串口设备探测类
//    */
//   export class Detector {
//     /**
//      * 全部的串口设备
//      */
//     private devices = new Map<string, PortInfo>();
//     /**
//      * 探测的timer
//      */
//     private timerId: any;

//     /**
//      * 串口设备探测类
//      *
//      * @param {number} interval 间隔时间
//      * @param {Filter} filter 过滤器
//      */
//     constructor(public interval: number = 5000, public filter?: Filter) {
//       this.filter = filter ? filter : (port: PortInfo) => true;
//     }

//     /**
//      * 获取key
//      */
//     computeKey(port: any) {
//       return typeof port == "string" ? port : port.locationId;
//     }

//     /**
//      * 获取串口设备数量
//      *
//      * @return 返回设备数量
//      */
//     size() {
//       return this.devices.size;
//     }

//     /**
//      * 判断串口设备是否存在
//      *
//      * @param {SerialPort} port 串口设备对象
//      * @return 返回是否存在串口设备
//      */
//     has(port: any) {
//       return this.devices.has(this.computeKey(port));
//     }

//     /**
//      * 获取串口设备
//      *
//      * @param {SerialPort|String} key 串口设备对象或串口的
//      * @return 返回串口设备
//      */
//     get(key: any) {
//       return this.devices.get(this.computeKey(key));
//     }

//     /**
//      * 保存串口设备
//      *
//      * @param {SerialPort} port 串口设备对象
//      */
//     put(port: PortInfo) {
//       this.devices.set(this.computeKey(port), port);
//       return port;
//     }

//     /**
//      * 移除串口设备
//      *
//      * @param {SerialPort} port 串口设备对象
//      */
//     remove(port: PortInfo) {
//       this.devices.delete(this.computeKey(port));
//       return port;
//     }

//     /**
//      * 清空串口设备
//      */
//     clear() {
//       this.devices.clear();
//     }

//     /**
//      * 迭代串口设备
//      *
//      * @param {callback} Function 回调
//      */
//     forEach(cb: (value: PortInfo, key: string) => void) {
//       if (cb && this.devices.size) {
//         this.devices.forEach((v, k) => cb(v, k));
//       }
//     }

//     /**
//      * 探测
//      */
//     private _detecting(_this: any) {
//       SerialPort.list()
//         .then((ports: PortInfo[]) => {
//           _this.forEach((port: PortInfo) => _this.setState(port, 0));
//           ports
//             .filter((p) => _this.filter(p))
//             .forEach((p) => {
//               let port = _this.get(p);
//               port = _this.setState(port ? port : p, port ? 2 : 1);
//               _this.put(port);
//             });
//           _this.forEach((port: PortInfo) => {
//             if (_this.isExist(port)) {
//               _this.setState(port, 2);
//             } else if (_this.isAttach(port)) {
//               _this.attach(port);
//             } else {
//               _this.detach(port);
//             }
//           });
//         })
//         .catch((err: Error) => log.error(err));
//     }

//     /**
//      * 加载串口设备
//      */
//     attach(port: PortInfo) {
//       try {
//         if (!this.has(port)) {
//           this.put(port);
//         }
//         this.onAttach(port);
//       } catch (err) {
//         log.error(err);
//       } finally {
//         this.setState(port, 2);
//       }
//     }

//     /**
//      * 移除串口设备
//      */
//     detach(port: PortInfo) {
//       this.setState(port, 0);
//       this.remove(port);
//       try {
//         this.onDetach(port);
//       } catch (err) {
//         log.error(err);
//       }
//     }

//     /**
//      * 开始探测
//      */
//     start(clear: boolean = true) {
//       if (!this.timerId) {
//         let _this = this;
//         this.timerId = setInterval(() => this._detecting(_this), this.interval);
//         if (clear) {
//           this.clear();
//         }
//       }
//     }

//     /**
//      * 停止探测
//      */
//     stop() {
//       if (this.timerId) {
//         clearInterval(this.timerId);
//         this.clear();
//         this.timerId = null;
//       }
//     }

//     /**
//      * 设置串口的状态
//      *
//      * @param {PortInfo} port 串口对象
//      * @param {number} index 状态的索引
//      * @return 返回当前的串口对象
//      */
//     setState(port: PortInfo, state: State) {
//       (port as any).state = state;
//       return port;
//     }

//     /**
//      * 判断串口的状态
//      *
//      * @param {PortInfo} port 串口对象
//      * @param {number} index 状态的索引
//      * @return 返回是否为当前要求的状态
//      */
//     isState(port: PortInfo, state: State) {
//       return (port as any).state == state;
//     }

//     /**
//      * 是否为失去关联的设备
//      *
//      * @param {PortInfo} port 串口对象
//      */
//     isDetach(port: PortInfo) {
//       return this.isState(port, 1);
//     }

//     /**
//      * 是否为新关联的设备
//      *
//      * @param {PortInfo} port 串口对象
//      */
//     isAttach(port: PortInfo) {
//       return this.isState(port, 1);
//     }

//     /**
//      * 是否为已存在的设备
//      *
//      * @param {PortInfo} port 串口对象
//      */
//     isExist(port: PortInfo) {
//       return this.isState(port, 2);
//     }

//     /**
//      * 监听设备上线
//      *
//      * @param {PortInfo} port 串口对象
//      */
//     onAttach(port: PortInfo) {
//       log.debug("设备上线" + JSON.stringify(port));
//     }

//     /**
//      * 监听设备离线
//      *
//      * @param {PortInfo} port 串口对象
//      */
//     onDetach(port: PortInfo) {
//       log.debug("设备离线" + JSON.stringify(port));
//     }
//   }

//   /**
//    * 默认的探测对象
//    */
//   export const detector = new Detector(3000, (port: PortInfo) => true);
//   detector.onAttach = (port) => log.info("设备上线", port);
//   detector.onDetach = (port) => log.info("设备离线", port);

//   // detector.start(true);
// }
