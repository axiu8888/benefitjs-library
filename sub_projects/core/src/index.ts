/*
 * @Description:
 * @Date: 2023-11-29
 */
export * from './libs/core';
export * from './libs/proxy';
export * from './libs/binary-helper';

// MQTT
export * from './libs/mqtt/paho-mqtt';
export * from './libs/mqtt/mqtt';


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
