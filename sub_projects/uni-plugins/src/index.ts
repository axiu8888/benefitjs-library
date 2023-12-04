/*
 * @Description:
 * @Date: 2023-11-29
 */
export * from './libs/uni/uniapp'; // UNI
export * from './libs/uni/udp'; // UDP
export * from './libs/uni/bluetooth'; // 蓝牙

// 各种设备
export * from './libs/devices/collector'; // 采集器
export * from './libs/devices/collector-client'; // 采集器-蓝牙客户端
export * from './libs/devices/zcenter'; // 中央台
export * from './libs/devices/v3-bp'; // v3 血压计
export * from './libs/devices/u9-bp'; // u9 血压计
export * from './libs/devices/fourier'; // 傅立叶 H1 和 A4(未完成)
export * from './libs/devices/wis-health'; // 呼吸训练器
// export * from "./libs/devices/lanbei"; // 兰贝(暂未完成)

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
