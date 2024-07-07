import { logger } from "@benefitjs/core";
import { AddressInfo } from "net";
import dgram from 'dgram';

/**
 * UDP
 */
export namespace udp {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("UDP", logger.Level.warn);

  /**
   * 获取IPv4地址
   *
   * @param address 地址
   * @returns 返回IPv4地址
   */
  export const ipv4Address = (address: AddressInfo) => address.address + ":" + address.port;

  /**
   * 绑定端口
   *
   * @param address 地址
   * @param listener 监听
   * @returns 返回Socket对象
   */
  export function bind(address: dgram.BindOptions, listener: ServerListener) {
    // 创建UDP服务
    const server = dgram.createSocket("udp4");
    const localAddress = (address.address ? address.address : '127.0.0.1') + ':' + address.port;
    // 连接时被触发
    server.on("connect", () => {
      log.debug(`[${localAddress}] onConnect`);
      listener.onClose?.(server);
    });
    // 成功监听时被触发
    server.on("listening", function () {
      log.debug(`[${localAddress}] onListening`);
      listener.onListening?.(server);
    });
    // 接收消息
    server.on("message", (message, remote) => {
      log.debug(`[${localAddress}] onMessage, remote:`, remote);
      listener.onMessage(server, message, remote);
    });
    // 错误
    server.on("error", (err) => {
      log.warn(`[${localAddress}] onConnect`, err);
      listener.onError?.(server, err);
    });
    // 关闭
    server.on("close", () => {
      log.debug(`[${localAddress}] onConnect`);
      listener.onClose?.(server);
    });
    // 绑定端口
    server.bind(address);
    return server;
  }

  /**
   * 服务端监听
   */
  export interface ServerListener {
    /**
     * 连接
     *
     * @param server UDP服务端
     */
    onConnect?(server: dgram.Socket): void;

    /**
     * 连接中
     *
     * @param server UDP服务端
     */
    onListening?(server: dgram.Socket): void;

    /**
     * 消息
     *
     * @param server UDP服务端
     * @param message 消息
     * @param remote 远程地址
     */
    onMessage(server: dgram.Socket, message: Buffer, remote: dgram.RemoteInfo): void;

    /**
     * 出现错误
     *
     * @param server UDP服务端
     * @param err 异常
     */
    onError?(server: dgram.Socket, err: Error): void;

    /**
     * 关闭
     *
     * @param server UDP服务端
     */
    onClose?(server: dgram.Socket): void;
  }

}
