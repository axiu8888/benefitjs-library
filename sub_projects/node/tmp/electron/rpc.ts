import { utils } from "@benefitjs/core";

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
  export interface WithPromise {
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


  export interface InvokeRequest {
    /**
     * 请求ID
     */
    id: any,
    /**
     * 函数名
     */
    fn: any;
    /**
     * 参数
     */
    args: any[];
  }

  /**
   * 获取对象函数
   */
  export interface ObtainTargetFn {
    (req: Request): Function;
  }

  /**
   * RPC 调用管理
   */
  export class Manager {
    /**
     * 调用栈
     */
    private calls = new Map<string, Request & WithPromise>();

    constructor(protected obtainTargetFn: ObtainTargetFn) { }

    /**
     * 获取请求
     * 
     * @param id 请求ID
     * @returns 返回请求
     */
    get(id: string) {
      return this.calls.get(id);
    }

    /**
     * 移除请求
     * 
     * @param id 请求ID
     * @returns 返回被移除的请求
     */
    remove(id: string) {
      let removed = this.get(id);
      this.calls.delete(id);
      return removed;
    }

    /**
     * 调用请求
     * 
     * @param target 目标对象
     * @param fn 函数
     * @param args 参数
     * @param timeout 超时时长
     * @param call 回调(真正处理请求的操作)
     * @returns 返回请求对象
     */
    invoke(target: string, fn: string, args: any[], timeout: number = 30_000, call: Function) {
      return new Promise<any>((resolve, reject) => {
        const req = <rpc.Request & rpc.WithPromise>{ target, fn, args, id: utils.uuid(), resolve, reject };
        try {
          this.calls.set(req.id, req);
          req.timeoutId = setTimeout(() => {
            this.remove(req.id);
            reject(new Error(`${req.target}.${req.fn}() 请求超时`));
          }, timeout);
          call(req);
        } catch (e) {
          this.remove(req.id);
          reject(e);
        }
      });
    }

    /**
     * 处理调用请求
     * 
     * @param req 请求
     * @returns 返回调用结果
     */
    handleRequest(req: Request) {
      let response = <Response>{ id: req.id, code: 200, data: undefined };
      return new Promise<Response>((resolve, reject) => {
        new Promise((resolve, reject) => {
          try {
            let fn = this.obtainTargetFn(req);
            if (fn) {
              let result = fn(...req.args)
              if (result instanceof Promise) result.then(resolve).catch(reject);
              else resolve(result);
            } else {
              reject(new Error(`无法找到target对象: ${req.target}.${req.fn}()`));
            }
          } catch (e) {
            reject(e)
          }
        })
          .then(res => response.data = res)
          .catch(e => {
            response.code = 400;
            response.error = (e as Error).message;
            response.data = e;
          })
          .finally(() => resolve(response));
      });
    }

    /**
     * 处理调用响应
     * 
     * @param resp 响应
     * @returns 返回调用结果
     */
    handleResponse(resp: Response) {
      return new Promise<Request>((resolve, reject) => {
        let req = this.remove(resp.id)
        if (!req) {
          reject(new Error('未发现对应请求: ' + resp.id));
          return;
        }
        try {
          clearTimeout(req.timeoutId);
          if (Math.round(resp.code / 200) == 1) req.resolve(resp.data);
          else req.reject(new Error(resp.error))
        } finally {
          resolve(req);
        }
      });
    }

  }

}
