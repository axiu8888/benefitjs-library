import { utils } from '../core';
import { mqtt } from '../mqtt';
import { Paho } from './paho-mqtt';

/**
 * MQTT
 */
export namespace MQTT {
  /**
   * 日志打印
   */
  export const log = mqtt.log;
  /**
   * 生成客户端ID
   */
  export const nextClientId = (prefix = 'mqttjs_') => prefix + utils.uuid().substring(0, 16);

  /**
   * MQTT客户端
   */
  export class Client {
    /**
     * MQTT客户端
     */
    raw: Paho.Client;
    /**
     * 自动重连的客户端
     */
    private autoReconnectTimerId: any;
    /**
     * 分发消息
     */
    protected readonly dispatcher = new mqtt.Dispatcher<Subscriber>();

    constructor(public opts: Options) {
      this.opts = utils.copyAttrs(opts, <Options>{
        clientId: nextClientId(),
        port: 8083,
        path: '/mqtt',
        userName: '',
        password: '',
        mqttVersion: 4,
        mqttVersionExplicit: false,
      });
      try {
        this.raw = new Paho.Client(opts.host, opts.port, opts.path, opts.clientId);
        this.raw.onConnectionLost = (args: any) => this.onConnectionLost(args);
        this.raw.onMessageArrived = (args: any) => this.onMessageArrived(args);
        this.raw.onMessageDelivered = (args: any) => this.onMessageDelivered(args);
      } catch (err) {
        log.warn(err);
        throw err;
      }
    }

    protected rawSubscribe(ms: Subscription, topic: string, qos: number = 0): boolean {
      if (this.isConnected()) {
        this.raw.subscribe(topic, <any>{ qos: qos });
        return true;
      }
      return false;
    }

    protected rawUnsubscribe(ms: Subscription, topic: string) {
      if (this.isConnected()) {
        this.raw.unsubscribe(topic, <any>{});
      }
    }

    get clientId() {
      return this.opts.clientId;
    }

    /**
     * 是否已连接
     */
    isConnected(): boolean {
      return this.raw?.connected;
    }

    /**
     * 连接
     */
    connect() {
      if (this.isConnected()) return;
      // uris: [`ws://${this.opts.host}:${this.opts.host}${this.opts.path}`],
      // connect the client
      //userName: 'admin', password: 'public'
      try {
        let { userName, password, timeout, keepAliveInterval, willMessage, cleanSession, useSSL, mqttVersion, mqttVersionExplicit } = this.opts;
        this.raw.connect(
          utils.copyAttrs({ userName, password, timeout, keepAliveInterval, willMessage, cleanSession, useSSL, mqttVersion, mqttVersionExplicit }, <any>{
            onSuccess: (res: any) => this.onConnect(false, this.raw.connectOptions.uri),
            onFailure: (lost: ConnectLost) => this.onConnectionLost(lost),
          }, false),
        );
      } catch (err: any) {
        log.warn(err);
        throw new Error('连接失败: ' + err);
      }
    }
    /**
     * 断开连接
     */
    disconnect() {
      try {
        this.raw.disconnect();
      } finally {
        this.stopAutoReconnect(); // 停止自动重连
      }
    }

    /**
     * 订阅主题
     *
     * @param topic 过滤规则：/device/#
     * @param opts 订阅参数
     */
    subscribe(subscriber: Subscriber, topic: string, qos: number = 0) {
      if (!topic) throw new Error('topic不能为空');
      if (!subscriber) throw new Error('订阅者不能为null');

      let subscription = this.dispatcher.getSubscription(subscriber);
      let exist = subscription ? true : false;
      if (!subscription) {
        subscription = <Subscription>{
          topics: new Map<String, SubscriptionTopic>(),
          subscriber: subscriber,
          getTopics(filter) {
            return utils.mapValuesToArray(this.topics).filter(filter);
          },
          hasTopic(topic) {
            return this.topics.has(mqtt.getTopic(topic).topicName);
          },
          addTopics(...topics) {
            topics.forEach((topic) => this.topics.set(topic.topic.topicName, topic));
          },
          removeTopics(...topics): SubscriptionTopic[] {
            let removed = <SubscriptionTopic[]>[];
            this.topics.forEach((mt) => {
              if (topics.includes(mt.topic.topicName)) {
                removed.push(mt);
              }
            });
            removed.forEach((mt) => this.topics.delete(mt.topic.topicName));
            return removed;
          },
        };
      }
      let sent = false;
      if (!subscription.hasTopic(topic)) {
        // 添加订阅
        subscription.addTopics({ topic: mqtt.getTopic(topic), qos: qos });
        if (!exist) {
          this.dispatcher.addSubscription(subscription);
        }
        // 调用订阅的方法(多次订阅相同主题没有问题，取消订阅时则需要判断是否有其他订阅者)
        sent = this.rawSubscribe(subscription, topic, qos);
      }
      log.debug(`subscribe, subscription: ${subscription.topics}, sent: ${sent}, ${this.isConnected()}`);
    }

    /**
     * 取消订阅主题
     *
     * @param 订阅者
     * @param topic 过滤规则：/device/#
     */
    unsubscribe(subscriber: Subscriber, topic: string = 'all') {
      let subscription = this.dispatcher.getSubscription(subscriber);
      if (subscription) {
        try {
          // 移除相关的主题
          let uniqueTopics = this.dispatcher.getUniqueTopics(subscription);
          if (uniqueTopics.length <= 0) {
            return;
          }
          utils.tryCatch(() => {
            // 取消订阅
            if (topic === 'all') {
              subscription.topics.clear();
              if (this.isConnected() && uniqueTopics.length > 0) {
                uniqueTopics.forEach((name) => this.rawUnsubscribe(subscription, name));
              }
            } else {
              subscription.removeTopics(topic);
              if (uniqueTopics.includes(topic)) {
                // 取消订阅
                this.rawUnsubscribe(subscription, topic);
              }
            }
          });
        } finally {
          // 如果没有订阅的主题了，就移除监听者
          if (subscription.topics.size <= 0) {
            this.dispatcher.removeSubscription(subscriber);
          }
        }
      }
    }

    /**
     * 发布消息
     *
     * @param topic 主题
     * @param payload 数据载荷
     * @param qos 服务质量: 0/1/2
     * @param retained 如果为true，则消息将由服务器保留并传递给当前和未来的订阅。如果为false，
     *                 则服务器只将消息传递给当前订阅者，这是新消息的默认值。如果消息是在保留布尔值设置为true的情况下发布的，
     *                 并且订阅是在消息发布之后进行的，则接收到的消息将保留布尔值设置为true。
     * @returns 是否发送成功(只检查是否连接，如果连接了，默认发送成功)
     */
    publish(topic: string, payload: string | ArrayBuffer, qos: number = 0, retained: boolean = false) {
      // let msg = new Paho.Message(payload);
      // msg.destinationName = topic;
      this.raw.publish(topic, payload, qos, retained);
      //this.raw.send(topic, payload, qos, retained);
    }

    /**
     * 连接成功
     */
    protected onConnect(reconnect: boolean, uri: string) {
      try {
        log.debug('连接成功: ', reconnect, uri);
        this.stopAutoReconnect();
        // 订阅
        this.dispatcher.subscriptions.forEach((ms) => {
          utils.tryCatch(() => ms.topics.forEach((mt) => this.rawSubscribe(ms, mt.topic.topicName, mt.qos)));
          utils.tryCatch(() => utils.applyFnWithTry(ms.subscriber.onConnected, this));
        });
      } catch (err) {
        log.warn('mqtt onConnect', err);
      }
    }

    /**
     * 连接断开
     *
     * @param res 连接断开的原因
     */
    protected onConnectionLost(res: ConnectLost) {
      try {
        if (res.errorCode !== 0) {
          this.startAutoReconnect();
          if (res.errorCode == 7 && (!res.errorMessage || res.errorMessage.includes(':undefined'))) {
            res.errorMessage = 'network error';
          }
          // 客户端可能自动断开了，这时需要重连
          this.dispatcher.subscriptions.forEach((ms, _topic) => utils.applyFnWithTry(ms.subscriber.onConnectLost, this, res));
        } else {
          this.stopAutoReconnect(); // 停止自动重连
          // 断开连接
          this.dispatcher.subscriptions.forEach((ms, _topic) => utils.applyFnWithTry(ms.subscriber.onDisconnected, this));
        }
      } catch (err) {
        log.warn('mqtt onConnectionLost', err);
      }
    }

    /**
     * 接收到消息
     *
     * @param message 消息
     */
    protected onMessageArrived(message: MqttMessage) {
      try {
        this.dispatcher.dispatch(this, message.topic, message);
      } catch (err) {
        log.warn(`分发消息时出现错误: ${message.topic}`, err);
      }
    }

    /**
     * 消息发送成功
     *
     * @param message 消息
     */
    protected onMessageDelivered(message: MqttMessage) {
      this.dispatcher.subscriptions.forEach((ms, _topic) => utils.applyFnWithTry(ms.subscriber.onMessageDelivered, this, message));
    }

    /**
     * 开始自动连接
     */
    protected startAutoReconnect() {
      if (!this.autoReconnectTimerId && this.opts.autoReconnectInterval > 0) {
        this.opts.autoReconnectInterval = Math.max(this.opts.autoReconnectInterval, 3000);
        this.autoReconnectTimerId = setInterval(() => {
          if (this.isConnected()) {
            return;
          }
          try {
            this.connect();
          } catch (err) { }
        }, this.opts.autoReconnectInterval);
      }
    }

    /**
     * 停止自动连接
     */
    protected stopAutoReconnect() {
      if (this.autoReconnectTimerId) {
        clearInterval(this.autoReconnectTimerId);
        this.autoReconnectTimerId = undefined;
      }
    }
  }


  /**
   * 订阅
   */
  export interface Subscription extends mqtt.Subscription<Subscriber> { }
  /**
   * 订阅主题
   */
  export interface SubscriptionTopic extends mqtt.SubscriptionTopic { }

  /**
   * MQTT消息分发器
   */
  export interface MqttMessageDispatcher extends mqtt.Dispatcher<Subscriber> {

    /**
     * 分发消息
     *
     * @param client 客户端
     * @param topic 主题
     * @param msg 消息
     */
    dispatch(client: any, topic: string, msg: MqttMessage): void;

  }


  /**
   * MQTT消息订阅
   */
  export interface Subscriber extends mqtt.Subscriber {
    /**
     * 客户端连接成功
     *
     * @param client 客户端
     */
    onConnected?(client: Client): void;

    /**
     * 客户端断开连接
     *
     * @param client 客户端
     */
    onDisconnected?(client: Client): void;

    /**
     * 客户端连接断开，非主动断开
     *
     * @param client 客户端
     */
    onConnectLost?(client: Client, lost: ConnectLost): void;

    /**
     * 消息发送成功
     *
     * @param client 客户端
     */
    onMessageDelivered?(client: Client, msg: MqttMessage): void;
  }

  /**
   * MQTT消息
   */
  export interface MqttMessage {
    /**
     * 主题
     */
    topic: string;
    /**
     * 如果负载由有效的UTF-8字符组成，则负载为字符串。
     */
    readonly payloadString: string;
    /**
     * 负载类型为ArrayBuffer。
     */
    readonly payloadBytes: ArrayBuffer;
    /**
     * mandatory消息要发送到的目的地的名称(对于即将发送的消息)或从其接收消息的目的地的名称。(对于onMessage函数接收到的消息)。
     */
    destinationName: string;
    /**
     * 用于传递消息的服务质量。
     *  0 Best effort(默认值)。
     *  1 至少一次。
     *  2 正好有一次。
     */
    qos: number;
    /**
     * 如果为true，则消息将由服务器保留并传递给当前和未来的订阅。
     * 如果为false，则服务器只将消息传递给当前订阅者，这是新消息的默认值。
     * 如果消息是在保留布尔值设置为true的情况下发布的，并且订阅是在消息发布之后进行的，则接收到的消息将保留布尔值设置为true。
     */
    retained: boolean;
    /**
     * 如果为true，则此消息可能是已收到消息的副本。这只在从服务器接收的消息上设置。
     */
    readonly duplicate: boolean;
  }

  /**
   * 断开连接
   */
  export interface ConnectLost {
    /**
     * 错误码
     */
    errorCode: number;
    /**
     * 错误信息
     */
    errorMessage: string;
  }

  /**
   * MQTT参数
   */
  export interface Options {
    /**
     * 客户端ID: mqttjs_12233334343333
     */
    clientId: string;
    /**
     * 主机地址
     */
    host: string;
    /**
     * 端口：18083
     */
    port: number;
    /**
     * 路径: /mqtt
     */
    path: string;
    /**
     * 用户名
     */
    userName: string;
    /**
     * 密码
     */
    password: string;
    /**
     * 如果在这个秒数内连接没有成功，则认为连接失败。缺省值是30秒。
     */
    timeout?: number;
    /**
     * 断开后自动连接的间隔，至少3秒，如果小于等于0，表示不自动重连
     */
    autoReconnectInterval: number;
    /**
     * 如果在这几秒内没有活动,服务器将断开连接此客户端。假设如果不设置,默认值为60秒。
     */
    keepAliveInterval?: number;
    /**
     * 客户端异常断开连接时服务器发送，Paho.Message
     */
    willMessage?: any;
    /**
     * 如果为true(默认值)，则在连接成功时删除客户端和服务器的持久状态。
     */
    cleanSession?: boolean;
    /**
     * 如果存在且为true，则使用SSL Websocket连接。
     */
    useSSL?: boolean;
    /**
     * 用于连接到MQTT代理的MQTT版本。
     * 3 - MQTT v3.1
     * 4 - MQTT v3.1.1
     */
    mqttVersion: number;
    /**
     * 如果设置为true，将强制连接使用所选的MQTT版本，否则将连接失败。
     */
    mqttVersionExplicit: boolean;
  }

}
