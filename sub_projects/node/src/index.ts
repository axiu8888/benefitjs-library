/*
 * 导出的接口
 */
export * from './libs/io'; // IO
export * from './libs/udp'; // UDP


// // electron
// export * from './libs/electron/rpc'; // rpc
// export * from './libs/electron/electron-main'; // ElectronMain
// export * from './libs/electron/electron-render'; // ElectronRender
// // export * from './libs/electron/web-bt-collector'; // 浏览器的蓝牙客户端


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
