/**
 * 自动连接器
 */
export namespace connector {
  /**
   * 自动连接器
   */
  export class AutoConnector {
    /**
     * 是否自动连接
     */
    autoConnect: boolean = true;
    /**
     * 连接间隔(秒)，默认10秒
     */
    interval: number = 10;
    /**
     * 连接锁
     */
    private lock: any = undefined;
    /**
     * 调度ID
     */
    private timerId: any;

    constructor(public connection: Connection, interval: number = 10) {
      if (!connection) throw new Error("Connection不能为undefined");
      this.interval = interval;
    }

    start(newConnection?: Connection) {
      if (newConnection) {
        this.stop();
        this.connection = newConnection;
      }
      if (this.timerId) return; // 已开始，不重复调用
      this.timerId = setInterval(() => {
        if (!this.autoConnect) {
          clearInterval(this.timerId);
          this.timerId = undefined;
          return;
        }

        // 连接
        if (!this.lock && !this.connection.isConnected()) {
          try {
            this.connection.doConnect();
          } finally {
            this.lock = undefined;
          }
        }
      }, Math.max(this.interval, 1) * 1000);
    }

    stop() {
      try {
        this.connection.doClose();
      } catch (e) {
        console.error(e);
      }
      if (this.timerId) {
        clearInterval(this.timerId);
        this.timerId = undefined;
        this.lock = undefined;
      }
    }
  }

  /**
   * 连接接口
   */
  export interface Connection {
    /**
     * 是否已连接
     */
    isConnected(): boolean;

    /**
     * 连接
     */
    doConnect(): void;

    /**
     * 断开或关闭
     */
    doClose(): void;
  }
}
