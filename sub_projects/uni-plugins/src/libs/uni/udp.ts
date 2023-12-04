import { binary } from "@benefitjs/core";
import { uniapp } from './uniapp';

/**
 * UDP服务
 */
export namespace udp {
  // 使用UniProxy代理调用
  const native = uniapp.requireNativePlugin('udp');
  /**
   * 获取一个可用的端口
   */
  export function obtainAvailablePort() {
    return native.invokePlugin('obtainAvailablePort');
  }

  /**
   * 获取监听中的UDP端口
   */
  export function activePorts() {
    return native.invokePlugin('activePorts');
  }

  /**
   * 停止UDP监听
   *
   * @param port 监听的端口
   * @param listener 回调: { data: [0x01, 0x02...], sender: '192.168.1.1:8080', recipient: '192.168.1.2:8090' }
   */
  export function onMessage(port: number, listener: uniapp.Callback<uniapp.PluginResponse<Message>>) {
    if (!listener) throw new Error('监听不能为空');
    return native.invokePlugin('onMessage', { port: port }, listener);
  }

  /**
   * 启动UDP监听
   *
   * @param port 监听的端口
   * @param callback 调用的回调
   * @param listener 数据监听
   */
  export function start(port: number, callback?: uniapp.Callback<uniapp.PluginResponse<number>>, listener?: uniapp.Callback<uniapp.PluginResponse<Message>>) {
    return native.invokePlugin('start', { port: port }, uniapp.wrapCB(callback), listener as any);
  }

  /**
   * 停止UDP监听
   *
   * @param port 监听的端口
   * @param callback 回调
   */
  export function stop(port: number, callback?: uniapp.Callback<uniapp.PluginResponse<any>>) {
    return native.invokePlugin('stop', { port: port }, uniapp.wrapCB(callback));
  }

  /**
   * 发送UDP数据
   *
   * @param port 监听的端口
   * @param data 发送的数据
   * @param recipient 远程接收者  host:port  => 192.168.1.198:62014
   * @param callback 回调
   */
  export function send(port: number, data: number[], recipient: string, callback?: uniapp.Callback<uniapp.PluginResponse<any>>) {
    let hex = binary.bytesToHex(data);
    return native.invokePlugin(
      'send',
      {
        port: port, // 启动的端口
        data: hex,
        recipient: recipient,
      },
      uniapp.wrapCB(callback),
    );
  }

  /**
   * UDP数据
   */
  export interface Message {
    /**
     * 发送者
     */
    sender: string;
    /**
     * 接受者
     */
    recipient: string;
    /**
     * 数据: 二进制
     */
    data: number[];
  }

}
