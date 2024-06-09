/**
 * 数据类型
 */
export namespace js_class {
  /**
   * 类型
   */
  export enum Type {
    /**
     * 未定义
     */
    undefined = 'undefined',
    /**
     * 整数
     */
    int = 'bigint',
    /**
     * 浮点数
     */
    float = 'float',
    /**
     * 字符串
     */
    string = 'string',
    /**
     * 浮点数
     */
    boolean = 'boolean',
    /**
     * 日期类型
     */
    date = 'date',
    /**
     * 符号类型
     */
    symbol = 'symbol',
    /**
     * 对象
     */
    object = 'object',
    /**
     * 函数
     */
    function = 'function',
    /**
     * 二进制 blob/arraybuffer/buffer
     */
    blob = 'blob',
  }

  /**
   * 查找类型
   *
   * @param value 值
   * @returns 返回类型
   */
  export function find(value: any) {
    let type: Type = Type.undefined;
    let _typeof = typeof value;
    if (_typeof !== 'undefined') {
      if (_typeof == 'bigint') {
        type = Type.int;
      } else if (_typeof == 'number') {
        type = Number.isInteger(value) ? Type.int : Type.float;
      } else if (_typeof == 'boolean') {
        type = Type.boolean;
      } else if (_typeof == 'string') {
        type = Type.string;
      } else if (_typeof == 'symbol') {
        type = Type.symbol;
      } else if (_typeof == 'object') {
        if (value instanceof Number) {
          type = Number.isInteger(value) ? Type.int : Type.float;
        } else if (value instanceof String) {
          type = Type.string;
        } else if (value instanceof Boolean) {
          type = Type.boolean;
        } else if (value instanceof Date) {
          type = Type.date;
        } else if (value instanceof Symbol) {
          type = Type.symbol;
        } else if (value instanceof Function) {
          type = Type.function;
        } else if (
          value instanceof ArrayBuffer ||
          value instanceof Buffer ||
          value instanceof Int8Array ||
          value instanceof Uint8Array ||
          value instanceof Int16Array ||
          value instanceof Uint16Array ||
          value instanceof Int32Array ||
          value instanceof Uint32Array ||
          value instanceof Float32Array ||
          value instanceof Float64Array ||
          value instanceof BigInt64Array ||
          value instanceof BigUint64Array
        ) {
          type = Type.blob;
        } else {
          type = Type.object;
        }
      } else if (_typeof == 'function') {
        type = Type.function;
      }
    }
    return type;
  }
}
