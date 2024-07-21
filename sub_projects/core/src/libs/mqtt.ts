import { utils } from './core';
import { logger } from './logger';

/**
 * MQTT
 */
export namespace mqtt {
  /**
   * 日志打印
   */
  export const log = logger.newProxy('MQTT', logger.Level.warn);

  /**
   * 分发消息
   */
  export class Dispatcher<T extends Subscriber> {
    /**
     * 订阅
     */
    public readonly subscriptions = new Map<T, Subscription<T>>();

    /**
     * 分发消息
     *
     * @param client 客户端
     * @param topic 主题
     * @param msg 消息
     * @param args 其他参数
     */
    dispatch(client: any, topic: string, msg: any, ...args: any) {
      this.subscriptions.forEach((subscription) => {
        if (this.match(topic, subscription)) {
          // 匹配符合订阅规则的主题
          try {
            // 分发给订阅者
            subscription.subscriber.onMessage(client, topic, msg, ...args);
          } catch (err) {
            log.warn(`订阅者处理数据时的错误, 请自行处理: ${topic}, ${subscription.subscriber}`, err);
          }
        }
      });
    }

    /**
     * 判断是否符合匹配订阅规则
     *
     * @param topic 主题
     * @param subscription 订阅者
     * @returns 是否匹配
     */
    match(topic: string, subscription: Subscription<T>): boolean {
      if (subscription.topics.size > 0) {
        let mt = getTopic(topic);
        if (utils.findItr(subscription.topics.values(), (v: any) => v.topic.match(mt))) {
          return true;
        }
      }
      return false;
    }

    /**
     * 获取Subscription
     *
     * @param subscriber 订阅者
     * @returns 返回订阅者
     */
    getSubscription(subscriber: T): Subscription<T> {
      return this.subscriptions.get(subscriber) as any;
    }

    /**
     * 添加Subscription
     *
     * @param 订阅者
     */
    addSubscription(subscription: Subscription<T>) {
      this.subscriptions.set(subscription.subscriber, subscription);
    }

    /**
     * 移除Subscription
     *
     * @param subscriber 订阅者
     * @returns 返回被移除的订阅者
     */
    removeSubscription(subscriber: T) {
      this.subscriptions.delete(subscriber);
    }

    /**
     * 全部的topic
     *
     * @param filter 过滤
     * @returns 获取匹配的主题
     */
    getTopics(filter: Predicate<Subscription<T>> = (s: Subscription<T>) => true): string[] {
      if (this.subscriptions.size <= 0) return <string[]>[];
      let topics = new Set<string>();
      this.subscriptions.forEach((ms) => filter(ms) && ms.getTopics((_mt) => true).forEach((mt) => topics.add(mt.topic.topicName)));
      return [...topics];
    }

    /**
     * 获取订阅者唯一的topic(其他订阅没有此主题)
     *
     * @param subscription 订阅者
     * @returns 获取匹配的主题
     */
    getUniqueTopics(subscription: Subscription<T>): string[] {
      let allTopics = this.getTopics((ms: Subscription<T>) => ms != subscription);
      return subscription
        .getTopics((mt) => true)
        .filter((mt) => !allTopics.includes(mt.topic.topicName))
        .map((mt) => mt.topic.topicName);
    }
  }

  /**
   * 订阅者
   */
  export interface Subscription<T extends Subscriber> {
    /**
     * 订阅的主题
     */
    readonly topics: Map<String, SubscriptionTopic>;

    /**
     * 订阅者
     */
    readonly subscriber: T;

    /**
     * 过滤主题
     *
     * @param filter 过滤器
     */
    getTopics(filter: Predicate<SubscriptionTopic>): SubscriptionTopic[];

    /**
     * 判断主题是否已存在
     *
     * @param topic 主题
     * @returns 返回判断结果
     */
    hasTopic(topic: string | Topic): boolean;

    /**
     * 添加主题
     *
     * @param topics 主题
     */
    addTopics(...topics: SubscriptionTopic[]): void;

    /**
     * 移除主题
     *
     * @param topics 主题
     * @returns 返回被移除的主题
     */
    removeTopics(...topics: string[]): SubscriptionTopic[];
  }

  /**
   * 订阅主题
   */
  export interface SubscriptionTopic {
    /**
     * 主题
     */
    topic: Topic;
    /**
     * 服务质量
     */
    qos: number;
  }

  /**
   * MQTT消息订阅
   */
  export interface Subscriber {
    /**
     * 接收到消息
     *
     * @param client 客户端
     * @param topic 主题
     * @param msg 消息
     * @param args 其他参数
     */
    onMessage(client: any, topic: string, msg: any, ...args: any): void;
  }

  /**
   * MQTT topic
   */
  export class Topic {
    /**
     * 节点片段
     */
    protected readonly segments: Array<string> = [];
    /**
     * 当前主题对应的节点
     */
    node: Node;

    constructor(public readonly topicName: string) {
      this.node = this.parseToNode(topicName);
    }

    /**
     * 递归解析 Mqtt 主题
     *
     * @param name 主题名
     * @returns 返回解析的节点对象
     */
    protected parseToNode(name: string): Node | any {
      if (name && name.trim().length > 0) {
        let value = slice(name, TOPIC_SLICER);
        this.segments.push(...value);
        return this.recursiveNode(value, 0, undefined as any);
      }
      return EMPTY_NODE;
    }

    protected recursiveNode(parts: string[], index: number, prev: Node): Node {
      if (parts.length <= index) return undefined as any;
      let current = new Node(parts[index], prev, undefined as any, index);
      current.prev = prev;
      current.next = this.recursiveNode(parts, ++index, current);
      return current;
    }

    /**
     * 匹配 topic
     */
    match(topic: Topic | string): boolean {
      if (typeof topic == 'string') {
        topic = getTopic(topic as string);
      }
      return this.node.match((topic as Topic).node);
    }
  }

  /**
   * 节点
   */
  export class Node {
    multi: boolean;
    single: boolean;

    constructor(public readonly part: string, public prev: Node, public next: Node, public level: number) {
      this.part = part.trim();
      this.prev = prev;
      this.next = next;
      this.level = level;

      this.multi = this.part == MULTI;
      this.single = this.part == SINGLE;
    }

    hasNext(): boolean {
      return this.next ? true : false;
    }

    /**
     * 匹配规则
     *
     * @param node 节点
     * @return 返回是否匹配
     */
    match(node: Node): boolean {
      if (!node) return false;
      if (EMPTY_NODE.equals(node)) return false;
      if (this.multi) return this.matchMulti(node); // 匹配多层
      if (this.single) return this.matchSingle(node); // 匹配单层
      return this.matchSpecial(node);
    }

    /**
     * 匹配多层级的规则
     *
     * @param node 节点
     * @return 返回是否匹配
     */
    matchMulti(node: Node): boolean {
      // 匹配多层级时，如果有下一级，继续检查下一级
      if (node.hasNext()) {
        let next = nextNode(this, PURE_FILTER);
        if (next) {
          // 获取第一个匹配的节点
          while (!next.equalsPart(node)) {
            node = node.next;
            if (!node) return false; // 找不到，不匹配
          }
          return next.match(node);
        }
      }
      return true;
    }

    /**
     * 匹配单层级规则
     *
     * @param node 节点
     * @return 返回是否匹配
     */
    matchSingle(node: Node): boolean {
      return this.hasNext() ? this.next.match(node.next) : !node.hasNext();
    }

    /**
     * 匹配具体规则
     *
     * @param node 节点
     * @return 返回是否匹配
     */
    matchSpecial(node: Node): boolean {
      if (this.equalsPart(node)) {
        if (this.hasNext() || node.hasNext()) return this.next && this.next.match(node.next);
        return true;
      }
      return false;
    }

    equalsPart(node: Node): boolean {
      return node && this.part == node.part;
    }

    /**
     * 是否
     *
     * @param o
     * @returns
     */
    equals(o: any): boolean {
      if (this == o) return true;
      if (!o || !(o instanceof Node)) return false;
      let node = o as Node;
      return this.part == node.part && this.level == node.level;
    }
  }

  const MULTI = '#';
  const SINGLE = '+';
  const EMPTY_NODE = new Node('', undefined as any, undefined as any, 0);
  // const MULTI_NODE = new Node('#', undefined as any, undefined as any, 0)
  // const SINGLE_NODE = new Node('+', undefined as any, undefined as any, 0)
  const PURE_FILTER: Predicate<Node> = (n) => !(n.part == MULTI || n.part == SINGLE);
  const EMPTY_TOPIC = new Topic('');
  const TOPICS = new Map<String, Topic>();

  /**
   * 获取主题
   *
   * @param name 主题名
   * @returns 返回主题
   */
  export function getTopic(name: string | Topic): Topic {
    if (!name) return EMPTY_TOPIC;
    if (typeof name !== 'string') return name as Topic;
    let topic = TOPICS.get(name);
    if (!topic) {
      TOPICS.set(name, (topic = new Topic(name)));
    }
    return topic!!;
  }

  function nextNode(node: Node, filter: Predicate<Node>): Node {
    let next: Node = node.next;
    while (next != null) {
      if (filter(next)) break;
      next = next.next;
    }
    return next;
  }

  /**
   * 分割字符串的分割器
   */
  export interface Slicer {
    /**
     * 匹配是否符合
     *
     * @param chars  字符串拼接
     * @param position 字符位置
     * @param ch       当前字符
     * @return 返回是否匹配
     */
    (chars: string[], position: number, ch: string): boolean;
  }

  /**
   * 默认的 topic 分割器
   */
  export const TOPIC_SLICER = <Slicer>((_b, _position, ch) => ch == '/');

  /**
   * 分割字符串
   *
   * @param str     字符串
   * @param slicer 分割器
   * @return 返回分割后的字符串
   */
  export function slice(str: string, slicer: Slicer): string[] {
    let buf = [],
      lines = [];
    for (let i = 0; i < str.length; i++) {
      if (slicer(buf, i, str.charAt(i))) {
        if (buf.length > 0) {
          lines.push(buf.splice(0, buf.length).join(''));
        }
        continue;
      }
      buf.push(str.charAt(i));
    }
    if (buf.length > 0) {
      lines.push(buf.join(''));
    }
    return lines;
  }

  /**
   * 过滤
   */
  export interface Predicate<T> {
    /**
     * 过滤
     *
     * @param v 过滤对象
     * @param args 其他参数
     */
    (v: T, ...args: any): boolean;
  }
}
