/*
 * @Author: dingxiaun
 */
export * from './libs/binary-helper'; // 二进制工具
export * from './libs/core'; // 基础工具: UUID、日期
export * from './libs/logger'; // 日志工具
export * from './libs/process-env'; // 运行环境(NodeJS、Electron、Browser)
export * from './libs/proxy'; // 动态代理
export * from './libs/http'; // HTTP 工具
export * from './libs/class'; // 类型
export * from './libs/thread'; // 线程
export * from './libs/mqtt'; // MQTT主题、消息分发
export * from './libs/auto-connector'; // 设备自动连接

// MQTT
export * from './libs/mqtt/paho-mqtt';
export * from './libs/mqtt/MQTT';

// 蓝牙
export * from './libs/bt/bluetooth';//蓝牙定义


// try {
//   var _doc = document;
//   var readyEvent = _doc.createEvent("Events");
//   readyEvent.initEvent("onJsBridgeReady");
//   (readyEvent as any).Bridge = Bridge;
//   (readyEvent as any).Android = Android;
//   _doc.dispatchEvent(readyEvent);
// } catch (err) {
//   console.error(err);
// }
