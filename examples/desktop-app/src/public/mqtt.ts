import { utils, MQTT } from "@benefitjs/core";
import { zcenter } from "@benefitjs/devices";
import { EventEmitter } from "eventemitter3";
import { log } from "./log";

/**
 * MQTT
 */
export namespace mqtt {
  /**
   * mqtt客户端连接
   */
  export const client = new MQTT.Client(<MQTT.Options>{
    // host: "192.168.1.198",
    // host: "pr.sensecho.com",
    // host: "172.22.128.1",
    host: "127.0.0.1",
    port: 80,
    // path: "/support/mqtt",
    path: "/mqtt",
    clientId: `mqttjs_${utils.uuid().substring(0, 16)}`,
    timeout: 2, // 连接超时
    autoReconnectInterval: 10, // 自动重连的间隔
    keepAliveInterval: 30,
  });

  /**
   * 发布消息
   * 
   * @param topic 主题
   * @param payload 消息
   */
  export const publish = (topic: string, payload: string) => client.publish(topic, payload);

  /**
   * 事件总线，用于发送订阅的数据
   */
  export const emitter = new EventEmitter();

  // 空的订阅
  client.subscribe(
    <MQTT.Subscriber>{
      onConnected(client) {
        log.debug(`${client.clientId}, 客户端连接成功`);
        emitter.emit(`client`, { type: "connected" });
      },
      onDisconnected(client) {
        log.debug(`${client.clientId}, 客户端关闭连接`);
        emitter.emit(`client`, { type: "disconnected" });
      },
      onConnectLost(client, lost) {
        log.debug(`${client.clientId}, 客户端连接断开`, lost);
        emitter.emit(`client`, { type: "connectLost", msg: lost });
      },
      onMessageDelivered(client, msg) {
        log.debug(`${client.clientId}, 消息送达`, msg);
        emitter.emit(`client`, { type: "messageDelivered", msg: msg });
      },
    },
    `/ignored/${utils.uuid()}`
  );

  /**
   * 采集器数据订阅
   */
  const collector_subscriber = <MQTT.Subscriber>{
    onMessage(client, topic, msg) {
      log.debug(`接收到采集器消息`, topic, msg);
      let pkg = zcenter.parseZCenter(msg.payloadBytes);
      const pkgTime = utils.dateFmt(pkg.time * 1000);
      //log.debug(`${topic}, sn: ${pkg.packageSn}, time: ${pkgTime}`);
      emitter.emit(`collector/${pkg.deviceId}`, pkg);
    },
  };
  const collector_subscriber2 = <MQTT.Subscriber>{
    onMessage(client, topic, msg) {
      log.debug(`接收到采集器消息`, topic, msg);
      let pkg = JSON.parse(msg.payloadString)
      //log.debug(`${topic}, sn: ${pkg.packageSn}, time: ${pkgTime}`);
      emitter.emit(`collector/${pkg.deviceId}`, pkg);
    },
  };

  /**
   * 订阅采集器数据
   *
   * @param deviceId 采集器ID, 如 01001234、11001234
   */
  export const subscribeCollector = (
    deviceId: string,
    cb?: (evt: any) => void
  ) => {
    client.subscribe(collector_subscriber, `hardware/${deviceId}`);
    client.subscribe(collector_subscriber2, `/device/collector/${deviceId}`);
    if (cb) emitter.on(`collector/${deviceId}`, cb);
  };
  /**
   * 取消采集器数据订阅
   *
   * @param deviceId 采集器ID, 如 01001234、11001234
   */
  export const unsubscribeCollector = (deviceId: string) => {
    client.unsubscribe(collector_subscriber, `hardware/${deviceId}`);
    client.unsubscribe(collector_subscriber2, `/device/collector/${deviceId}`);
  };

  /**
   * 搏英数据订阅
   */
  const holter_subscriber = <MQTT.Subscriber>{
    onMessage(client, topic, msg) {
      log.debug(`接收到Holter消息`, topic, msg);
      let pkg = JSON.parse(msg.payloadString);
      emitter.emit(`holter/${pkg.mac}`, pkg);
    },
  };

  /**
   * 订阅搏英数据
   *
   * @param mac 搏英MAC地址, 如 00195D244F11
   */
  export const subscribeHolter = (mac: string, cb?: (evt: any) => void) => {
    client.subscribe(holter_subscriber, `hardware/boying12/${mac}`);
    if (cb) emitter.on(`holter/${mac}`, cb);
  };

  /**
   * 取消搏英数据订阅
   *
   * @param mac 搏英MAC地址, 如 00195D244F11
   */
  export const unsubscribeHolter = (mac: string, cb?: (evt: any) => void) => {
    client.unsubscribe(holter_subscriber, `hardware/boying12/${mac}`);
    if (cb) emitter.removeListener(`holter/${mac}`, cb);
  };

  // 连接
  setTimeout(() => client.connect());
}
