import { utils } from './core';

/**
 * 二进制工具类
 */
export class BinaryHelper {
  /**
   * 是否支持 TextEncoder、TextDecoder
   */
  static hasTextCodec: boolean;

  static {
    try {
      //@ts-ignore
      if (typeof TextEncoder == 'undefined') {
        BinaryHelper.hasTextCodec = false;
      } else {
        BinaryHelper.hasTextCodec = new TextEncoder() != null && new TextDecoder('utf-8') != null;
      }
    } catch (err) {
      BinaryHelper.hasTextCodec = false;
    }
  }

  /**
   * 数组拷贝
   *
   * @param src 源数组
   * @param srcPos 源数组的开始位置
   * @param dest 目标数组
   * @param destPos 目标数组的开始位置
   * @param len 拷贝的长度
   * @returns 返回拷贝后的数组
   */
  arraycopy(src: Array<any> | any[], srcPos: number, dest: Array<any> | any[], destPos: number, len: number): number[] {
    if (!dest) {
      dest = new Array(len);
      destPos = 0;
    }
    for (let i = 0; i < len; i++) {
      dest[destPos + i] = src[srcPos + i];
    }
    return dest;
  }

  /**
   * 转换成 number[]
   *
   * @param src 数据源
   * @returns 返回转换后的 number[]
   */
  asNumberArray(src: number[] | Array<number> | Uint8Array | ArrayBuffer): number[] {
    if (typeof src === 'undefined') {
      return [];
    }
    if (src instanceof Array) {
      return src;
    }
    if (src instanceof ArrayBuffer) {
      return [...new Uint8Array(src)];
    }
    if (src instanceof Uint8Array) {
      return [...src];
    }
    return src as any;
  }

  /**
   * 转换成 number[]
   *
   * @param src 数据源
   * @returns 返回转换后的 number[]
   */
  asUint8Array(src: number[] | Array<number> | Uint8Array | ArrayBuffer): Uint8Array {
    if (typeof src === 'undefined') {
      return new Uint8Array([]);
    }
    if (src instanceof Uint8Array) {
      return src;
    }
    if (src instanceof Array) {
      return new Uint8Array(src);
    }
    if (src instanceof ArrayBuffer) {
      return new Uint8Array(src);
    }
    return src as any;
  }

  /**
   * 转换成 ArrayBuffer
   *
   * @param src 数据源
   * @returns 返回转换后的 ArrayBuffer
   */
  asArrayBuffer(src: number[] | Array<number> | Uint8Array | ArrayBuffer): ArrayBuffer {
    if (src instanceof ArrayBuffer) {
      return src;
    }
    if (src instanceof Uint8Array) {
      //@ts-ignore
      return src.buffer.byteLength != src.length ? src.buffer.slice(0, src.length) : src.buffer;
    }
    if (src instanceof Array) {
      return new Uint8Array(src).buffer;
    }
    return src as ArrayBuffer;
  }

  /**
   * 将字符串转换为字符数组
   *
   * @param str 字符串
   * @returns 返回转换后的字符数组
   */
  toCharArray(str: string): number[] {
    if (!str) return [];
    let array = <number[]>[];
    for (let i = 0, len = str.length; i < len; i++) {
      array[i] = str.charCodeAt(i);
    }
    return array;
  }

  /**
   * 转换为 UTF-8 的字节数据
   *
   * @param str 字符串
   * @returns 返回转换后的二进制数据
   */
  encodeUTF8(str: string): ArrayBuffer {
    const chars = this.toCharArray(str);
    const ui8a = new Uint8Array(new ArrayBuffer(chars.length * 4));
    let offset = 0;
    for (let i = 0, len = chars.length, code; i < len; i++) {
      code = chars[i];
      if (code < 0x80) {
        ui8a[offset++] = code;
      } else if (code < 0x800) {
        ui8a[offset++] = 0xc0 | (code >> 6);
        ui8a[offset++] = 0x80 | (code & 0x3f);
      } else if (code < 0x10000) {
        ui8a[offset++] = 0xe0 | (code >> 12);
        ui8a[offset++] = 0x80 | ((code >> 6) & 0x3f);
        ui8a[offset++] = 0x80 | (code & 0x3f);
      } else {
        ui8a[offset++] = 0xf0 | (code >> 18);
        ui8a[offset++] = 0x80 | ((code >> 12) & 0x3f);
        ui8a[offset++] = 0x80 | ((code >> 6) & 0x3f);
        ui8a[offset++] = 0x80 | (code & 0x3f);
      }
    }
    return this.asArrayBuffer(ui8a.subarray(0, offset));
  }

  /**
   * 将字符串转换为字节数组
   *
   * @param {String} str 字节数据
   */
  strToBytes(str: string): ArrayBuffer {
    return this.encodeUTF8(str);
  }

  /**
   * 将二进制字符串转换成Unicode字符串
   *
   * @param {number[]|Buffer|Array} bytes 字节数组
   */
  bytesToStr(bytes: number[] | Array<number> | Uint8Array | ArrayBuffer, charset = 'utf-8'): string {
    bytes = this.asArrayBuffer(bytes);
    if (BinaryHelper.hasTextCodec) {
      // 支持 TextDecoder
      let textDecoder = new TextDecoder(charset);
      return textDecoder.decode(bytes);
    }
    let dv = new DataView(bytes);
    let u8a = new Uint8Array(bytes.byteLength);
    u8a.forEach((v, i, arr) => (arr[i] = dv.getUint8(i)));
    let array = <string[]>[];
    for (let i = 0; i < u8a.length; i++) {
      let bin = u8a[i].toString(2);
      let v = bin.match(/^1+?(?=0)/);
      if (v && bin.length == 8) {
        let bytesLength = v[0].length;
        let store = u8a[i].toString(2).slice(7 - bytesLength);
        for (let st = 1; st < bytesLength; st++) {
          store += u8a[st + i].toString(2).slice(2);
        }
        array.push(String.fromCharCode(parseInt(store, 2)));
        i += bytesLength - 1;
      } else {
        array.push(String.fromCharCode(u8a[i]));
      }
    }
    return array.join('');
  }

  /**
   * base64字符串转为ArrayBuffer
   *
   * @param base64 base64字符串
   * @returns 返回ArrayBuffer
   */
  base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binStr = atob(base64); // 解码 Base64 字符串
    const length = binStr.length;
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
      bytes[i] = binStr.charCodeAt(i); // 将每个字符的 ASCII 值存入 TypedArray
    }
    return bytes.buffer; // 返回 ArrayBuffer 对象
  }

  /**
   * 16进制字符串转换为二进制数组
   *
   * @param {String} hex 16进制字符串
   */
  hexToBytes(hex: string): number[] {
    if (hex.length % 2 != 0) {
      throw new Error('不是16进制数据: ' + hex);
    }

    let array = <number[]>[];
    for (let i = 0; i < hex.length; i += 2) {
      array.push(parseInt(hex.substring(i, i + 2), 16));
    }
    return array;
  }

  /**
   * 字节数组转换为16进制
   *
   * @param {Array<number>|Uint8Array|ArrayBuffer} bytes 字节数组
   * @param {boolean} trim 是否清除空格
   */
  bytesToHex(bytes: Array<number> | Uint8Array | ArrayBuffer, trim = false): string {
    if (typeof bytes === 'undefined') return '';
    bytes = this.asNumberArray(bytes);
    let array = <string[]>[];
    for (let i = 0, len = bytes.length, tmp; i < len; i++) {
      tmp = (bytes[i] & 0xff).toString(16);
      if (tmp.length == 1) {
        array.push('0');
      }
      tmp = tmp.toUpperCase();
      if (!(trim && tmp === 'FF')) {
        array.push(tmp);
      }
    }
    return array.join('');
  }

  /**
   * 将数字转换为bit数组
   * 
   * @param value 数值
   * @param bits bit 数，默认至少8位
   * @returns 返回bit数组
   */
  numberToBinary(value: number, bits?: number): number[] {
    let buf: number[] = [];
    let v = value;
    let byteCount = (bits || 8) / 8;
    do {
      byteCount--;
      for (let i = 0; i < 8; i++) {
        buf.push(v & 1 ? 1 : 0);
        v = v >> 1;
      }
    } while (v != 0 && byteCount > 0);
    return buf;
  }

  /**
   * 将数字转换为bit字符串
   * 
   * @param value 数值
   * @param bits bit 数，默认至少8位
   * @returns 返回bit字符串
   */
  numberToBinaryStr(value: number, bits?: number): string {
    return this.numberToBinary(value, bits).join('');
  }
  
  /**
   * 往数组中push整数数据
   *
   * @param {Array<number>} bytes 原字节数组
   * @param {Number|String|Array<number>} payload  push的数据
   */
  pushBytes(bytes: Array<number>, payload: Number | String | Array<number>) {
    if (payload instanceof Number) {
      bytes.push((payload as Number).valueOf());
    } else if (payload instanceof String) {
      bytes.push(parseInt(payload.toString()));
    } else if (payload.length) {
      payload.forEach((v) => this.pushBytes(bytes, v));
    } else {
      if (typeof payload === 'number') {
        bytes.push(payload);
      } else if (typeof payload === 'string') {
        bytes.push(parseInt(payload));
      } else {
        throw new Error('不支持的类型数据: ' + JSON.stringify(payload));
      }
    }
  }

  /**
   * 将IP和端口转换为字节数组
   *
   * @param {string} ip IP地址
   * @param {number} port 端口
   * @param {boolean} bigEndian 端口是否为大端存储，默认为小端存储
   */
  hostToBytes(ip: string, port: number, bigEndian = false) {
    let array = <number[]>[];
    let splits = (ip + '').split('.');
    splits.forEach((v) => array.push(parseInt(v) & 0xff));
    if (port) {
      if (bigEndian) {
        // 大端存储
        array.push((port >> 8) & 0xff); // 端口高位
        array.push(port & 0xff); // 端口低位
      } else {
        // 小端存储
        array.push(port & 0xff); // 端口低位
        array.push((port >> 8) & 0xff); // 端口高位
      }
    }
    return array;
  }

  /**
   * 数值转换成字节数组
   *
   * @param num 数值
   * @param bit  位长度: 8/16/32/64
   * @param bigEndian 是否为大端
   */
  numberToBytes(num: number, bit: number, bigEndian = true): number[] {
    if (![8, 16, 32, 64].includes(bit)) {
      throw new Error('错误的字节位数(8/16/32/64): ' + bit);
    }
    let size = Math.floor(bit / 8);
    let bytes = <number[]>[];
    for (let i = 0; i < size; i += 1) {
      // 大端存储：高位在前，低位在后  数值先高字节位移，后低字节
      // 小端存储：低位在前，高位在后  数值先取低字节，后高字节依次右移
      bytes.push((bigEndian ? num >> (bit - 8 - i * 8) : num >> (i * 8)) & 0xff);
    }
    return bytes;
  }

  /**
   * 字节数组转换成整数
   *
   * @param bytes  字节数组
   * @param bigEndian  大端
   * @param signed 是否为有符号整数
   * @return 返回一个整数
   */
  bytesToNumber(bytes: Array<number> | Uint8Array | ArrayBuffer, bigEndian = true, signed = false): number {
    bytes = this.asNumberArray(bytes);
    // 大端存储：高位在前，低位在后
    // 小端存储：低位在前，高位在后
    let value = 0;
    // 正数的原码，高位为0，反码/补码均与原码相同；
    // 负数的原码：高位为1, 其他为正数的原码；反码是除符号位，其它按位取反；补码在反码的基础上 + 1
    if (bigEndian) {
      if (signed && (bytes[0] & 0b10000000) >> 7 == 1) {
        for (let b of bytes) {
          value <<= 8;
          value |= ~b & 0xff;
        }
        value = -value - 1;
      } else {
        for (let b of bytes) {
          value <<= 8;
          value |= b & 0xff;
        }
      }
    } else {
      if (signed && (bytes[bytes.length - 1] & 0b10000000) >> 7 == 1) {
        for (let i = bytes.length - 1; i >= 0; i--) {
          value <<= 8;
          value |= ~bytes[i] & 0xff;
        }
        value = -value - 1;
      } else {
        for (let i = bytes.length - 1; i >= 0; i--) {
          value <<= 8;
          value |= bytes[i] & 0xff;
        }
      }
    }
    return value;
  }

  /**
   * 字节数组转换成数字数组
   *
   * @param bytes  字节数组
   * @param bit 每一位的大小: 8/16/32/64  分別对应 1/2/4/8 个字节
   * @param bigEndian  大端
   * @param signed 是否为有符号整数
   * @param skipBefore 执行前跳过的字节数
   * @param skipAfter 执行后跳过的字节数
   * @return 返回一个整数
   */
  bytesToNumberArray(bytes: Array<number> | Uint8Array | ArrayBuffer, bit: number, bigEndian = true, signed = false, skipBefore = 0, skipAfter = 0): number[] {
    if (![8, 16, 32, 64].includes(bit)) {
      throw new Error('错误的字节位数(8/16/32/64): ' + bit);
    }
    bytes = this.asNumberArray(bytes);
    let size = bit / 8;
    let array = new Array<number>(bytes.length / (size + skipBefore + skipAfter));
    for (let i = 0, j = 0; i < bytes.length; i += size) {
      i += skipBefore;
      array[j++] = this.bytesToNumber(bytes.slice(i, i + size), bigEndian, signed);
      i += skipBefore;
    }
    return array;
  }

  /**
   * 整数转换成16进制字符串
   *
   * @param bytes  字节
   * @param bitSize  字节大小: 8/16/32/64
   * @param bigEndian 是否为大端存储
   * @param upperCase 是否为大写字母
   * @return 返回一个16进制字符串
   */
  numberToHex(value: number, bitSize: number, bigEndian = true): string {
    let bytes = this.numberToBytes(value, bitSize, bigEndian);
    return this.bytesToHex(bytes, false);
  }

  /**
   * 16进制字符串转换成整数
   *
   * @param hex  16进制字符串
   * @param order  字节序
   * @param signed 是否为有符号整数
   * @return 返回一个整数
   */
  hexToNumber(hex: string, bigEndian = true, signed = false) {
    let bytes = this.hexToBytes(hex);
    return this.bytesToNumber(bytes, bigEndian, signed);
  }

  /**
   * 整形转单精度浮点数
   *
   * @param value 可转换为float的整数值
   * @returns 返回float值
   */
  intBitsToFloat(value: number) {
    const buffer = new ArrayBuffer(4);
    const intArray = new Int32Array(buffer);
    const floatArray = new Float32Array(buffer);
    intArray[0] = value;
    return floatArray[0];
  }

  /**
   * 单精度浮点数转为整形
   *
   * @param value 单浮点数
   * @returns 返回转换后的整形
   */
  floatToIntBits(value: number) {
    const buffer = new ArrayBuffer(4);
    const floatArray = new Float32Array(buffer);
    const intArray = new Uint32Array(buffer);
    floatArray[0] = value;
    return intArray[0];
  }

  /**
   * 长整形转双精度浮点数
   *
   * @param value 可转换为double的整数值
   * @returns 返回double值
   */
  longBitsToDouble(value: number) {
    const buffer = new ArrayBuffer(8);
    const intArray = new BigInt64Array(buffer);
    const floatArray = new Float64Array(buffer);
    intArray[0] = BigInt(value);
    return floatArray[0];
  }

  /**
   * 双精度浮点数转为长整形
   *
   * @param value 双浮点数
   * @returns 返回转换后的长整形
   */
  doubleToLongBits(value: number) {
    const buffer = new ArrayBuffer(8);
    const doubleArray = new Float64Array(buffer);
    const longArray = new BigInt64Array(buffer);
    doubleArray[0] = value;
    return longArray[0];
  }

  /**
   * 将浮点数转换为16进制字符串
   *
   * @param float32 浮点数
   * @returns 返回转换后的16进制字符串
   */
  float32ToHex(float32: number): string {
    const getHex = (i: number) => ('00' + i.toString(16)).slice(-2);
    let view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, float32);
    return Array.apply(null, { length: 4 } as any)
      .map((_, i) => getHex(view.getUint8(i)))
      .join('');
  }

  /**
   * 将浮点数转换为2进制字符串
   *
   * @param float32 浮点数
   * @returns 返回转换后的2进制字符串
   */
  float32ToBin(float32: number): string {
    const HexToBin = (hex: string) => parseInt(hex, 16).toString(2).padStart(32, '0');
    const getHex = (i: number) => ('00' + i.toString(16)).slice(-2);
    let view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, float32);
    return HexToBin(
      Array.apply(null, { length: 4 } as any)
        .map((_, i) => getHex(view.getUint8(i)))
        .join(''),
    );
  }

  /**
   * 16进制转换为浮点数
   *
   * @param str 16进制字符串
   * @param decimalBits 小数点后保留几位
   * @param floor 是否向下取整
   * @returns 返回转换后的值
   */
  hexToFloat32(str: string, decimalBits = -1, floor = false): number {
    let int = parseInt(str, 16);
    if (int > 0 || int < 0) {
      let sign = int >>> 31 ? -1 : 1;
      let exp = ((int >>> 23) & 0xff) - 127;
      let mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
      let float32 = 0;
      for (let i = 0; i < mantissa.length; i += 1) {
        float32 += parseInt(mantissa[i]) ? Math.pow(2, exp) : 0;
        exp--;
      }
      return this.decimal(float32 * sign, decimalBits, floor);
    } else return 0;
  }

  /**
   * 2进制转换为浮点数
   *
   * @param str 2进制字符串
   * @param decimalBits 小数点后保留几位
   * @param floor 是否向下取整
   * @returns 返回转换后的值
   */
  binToFloat32(str: string, decimalBits = -1, floor = false): number {
    let int = parseInt(str, 2);
    if (int > 0 || int < 0) {
      let sign = int >>> 31 ? -1 : 1;
      let exp = ((int >>> 23) & 0xff) - 127;
      let mantissa = ((int & 0x7fffff) + 0x800000).toString(2);
      let float32 = 0;
      for (let i = 0; i < mantissa.length; i += 1) {
        float32 += parseInt(mantissa[i]) ? Math.pow(2, exp) : 0;
        exp--;
      }
      return this.decimal(float32 * sign, decimalBits, floor);
    } else return 0;
  }

  /**
   * 浮点数的参数
   */
  decimal(value: number, decimalBits = -1, floor = false): number {
    let delta = this.delta(decimalBits);
    return decimalBits > 0 ? (floor ? Math.floor(value * delta) / delta : Math.round(value * delta) / delta) : value;
  }

  /**
   * 浮点数的参数
   */
  delta(bits: number): number {
    let delta = 1;
    for (let i = 0; i < bits; i++) {
      delta *= 10;
    }
    return delta;
  }

  /**
   * 解析波形
   *
   * @param data      数据
   * @param start     开始的位置
   * @param end       结束的位置
   * @param pos       每组位置
   * @param size      每组的数量
   * @param perOffset 每个点的偏移量
   * @param step      每组的步长，比如：28个字节一个循环
   * @param bigEndian  大端
   * @param signed 是否为有符号整数
   * @return 返回解析后的数据
   */
  parseWave(data: number[], start: number = 0, end: number = data.length, pos: number, size: number, perOffset: number, step: number, bigEndian = true, signed = false): number[] {
    // (600 - 0) / 24 * size = 25 * size = 400 // 单导
    // (600 - 0) / 24 * 8 = 25 * 8 = 200 // 单导
    // (600 - 0) / 24 * size = 25 * size = 400 // 6导
    // (600 - 0) / 24 * 8 = 25 * 8 = 200 // 6导
    let wave = new Array<number>(((end - start) / step) * size);
    let buf = [];
    for (let i = start, j = 0; i < end; i += step) {
      for (let k = 0; k < size; k++, j++) {
        buf[0] = data[i + 2 * k + k * perOffset + pos];
        buf[1] = data[i + 1 + 2 * k + k * perOffset + pos];
        wave[j] = this.bytesToNumber(buf, bigEndian, signed);
      }
    }
    return wave;
  }

  /**
   * 判断两个数据是否相等
   *
   * @param src 源数组
   * @param srcPos 源数组开始的位置
   * @param dest 目标数组
   * @param destPos 目标数组开始的位置
   * @param len 比较的长度
   * @returns 返回判断的结果
   */
  isEquals(src: any[], srcPos: number, dest: any[], destPos: number, len: number) {
    if (src.length < len || dest.length < len) {
      return false;
    }
    for (let i = 0; i < len; i++) {
      if (src[i + srcPos] !== dest[i + destPos]) {
        return false;
      }
    }
    return true;
  }

  /**
   * ArrayBuffer 转换为16进制
   *
   * @param buffer ArrayBuffer
   * @returns 返回16进制字符串
   */
  ab2hex(buffer: ArrayBuffer) {
    let u8a = new Uint8Array(buffer);
    return Array.prototype.map.call(u8a, (bit) => ('00' + bit.toString(16)).slice(-2)).join('');
  }
}

export const binary = new BinaryHelper();

/**
 * 字节数据缓冲区
 */
export class ByteBuf {
  private _buf: number[] = [];

  clear() {
    this._buf = this._buf.length > 0 ? [] : this._buf;
  }

  /**
   * 返回数据长度
   */
  size(): number {
    return this._buf.length;
  }

  /**
   * 添加数据
   *
   * @param data 数据
   * @returns  返回添加后的长度
   */
  write(data: number[] | Array<number> | Uint8Array): number {
    return this._buf.push(...data);
  }

  /**
   * 读取数据
   *
   * @param start 开始的位置
   * @param len 长度
   * @param removed 是否移除读取的数据
   * @returns  返回读取的数组
   */
  read(start: number = 0, len: number = this.size(), removed = true): number[] {
    if (this.size() <= 0) {
      return [];
    }
    if (removed) {
      return this._buf.splice(start, len);
    }
    return this._buf.slice(start, len);
  }

  /**
   * 查找匹配数据的索引
   *
   * @param segment 检查的数据，如：[0x55, 0xaa]
   * @returns 返回索引的下标
   */
  find(segment: number[] | Array<number> | Uint8Array, offset = 0): number {
    const head = segment.slice(0, 1)[0];
    for (let start = offset; this._buf.length >= start + segment.length; ) {
      start = findIndexOf<number>(this._buf, start, (v) => v == head);
      if (start < 0) {
        return -1;
      }
      let flag = true;
      for (let k = 0; k < segment.length; k++) {
        if (this._buf[start + k] != segment[k]) {
          flag = false;
          break;
        }
      }
      if (flag) {
        return start;
      }
      start++;
    }
    return -1;
  }
}

export function findIndexOf<T>(array: Array<T>, start: number, predicate: utils.ArrayPredicate<T>) {
  for (let i = start; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      return start;
    }
  }
  return -1;
}

/**
 * 获取验证码byte数组，基于Modbus CRC16的校验算法
 */
export function CRC16(data: Array<number> | number[], start: number = 0, len: number = data.length, bigEndian = true) {
  // 预置 1 个 16 位的寄存器为十六进制FFFF, 称此寄存器为 CRC寄存器。
  let crc = 0xffff;
  for (let i = 0; i < len; i++) {
    let b = data[start + i];
    // 把第一个 8 位二进制数据 与 16 位的 CRC寄存器的低 8 位相异或, 把结果放于 CRC寄存器
    crc = (crc & 0xff00) | ((crc & 0x00ff) ^ (b & 0xff));
    for (let j = 0; j < 8; j++) {
      // 把 CRC 寄存器的内容右移一位( 朝低位)用 0 填补最高位, 并检查右移后的移出位
      if ((crc & 0x0001) > 0) {
        // 如果移出位为 1, CRC寄存器与多项式A001进行异或
        crc = crc >> 1;
        crc = crc ^ 0xa001;
      }
      // 如果移出位为 0,再次右移一位
      else crc = crc >> 1;
    }
  }
  return binary.numberToBytes(crc & 0xffff, 16, bigEndian);
}
