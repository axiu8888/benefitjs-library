/**
 * RPC
 */
export namespace rpc {
  /**
   * 请求
   */
  export interface Request {
    /**
     * 请求ID
     */
    id: any;
    /**
     * 超时调度ID
     */
    timeoutId: any;
    /**
     * 目标对象
     */
    target: string;
    /**
     * 函数
     */
    fn: string;
    /**
     * 参数
     */
    args: any[];
  }

  /**
   * 响应
   */
  export interface Response {
    /**
     * 请求ID
     */
    id: any;
    /**
     * 结果码: 200/400/500
     */
    code: number;
    /**
     * 错误信息
     */
    error: string;
    /**
     * 响应结果
     */
    data: any;
  }

  /**
   * promise选项
   */
  export interface Promise {
    resolve: any;
    reject: any;
  }

  /**
   * 事件
   */
  export interface Event {
    /**
     * ID
     */
    id: any;
    /**
     * 通道 或 事件(名)类型
     */
    channel: string;
    /**
     * 数据
     */
    data: any;
  }
}
