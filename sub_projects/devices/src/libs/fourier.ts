/**
 * 傅里叶设备：智能电动训练车、上下肢主被动训练车
 */

import { binary, utils, ByteBuf, GattUUID, IDevice } from '@benefitjs/core';

/**
 * H1设备
 */
export namespace h1 {
  /**
   * UUID
   */
  export const uuid = <GattUUID>{
    service: '0000ffe1-0000-1000-8000-00805f9b34fb',
    readCharacteristic: '0000ffe2-0000-1000-8000-00805f9b34fb',
    writeCharacteristic: '0000ffe3-0000-1000-8000-00805f9b34fb',
    notifyCharacteristic: '0000ffe2-0000-1000-8000-00805f9b34fb',
    readDescriptor: '00002902-0000-1000-8000-00805f9b34fb',
    notifyDescriptor: '00002902-0000-1000-8000-00805f9b34fb',
    mtu: 512,
  };

  export class Device implements IDevice {
    buf = new ByteBuf();
    uuid = uuid;
    options?: Options;

    addBuf(value?: number[] | undefined): number[] | undefined {
      let buf = this.buf;
      if (value && value.length > 0) {
        buf.write(value);
      }
      while (buf.size() > 5) {
        let head = buf.read(0, 5, false);
        if (!this.isResponseHead(head)) {
          // 如果不是包头
          buf.read(0, 1); // 丢弃一个字节
          continue;
        }
        // 【M<-S】 =>: 4
        // 头4 + 长度1 + (类型1 + 数据长度n) + 校验和1
        let len = 4 + 1 + (head[4] & 0xff) + 1;
        if (buf.size() >= len) {
          let data = buf.read(0, len);
          return data;
        } else {
          return;
        }
      }
    }

    resolve(data: number[]): any {
      // 解析
      switch (data[5] & 0xff) {
        case 0x11: // 呼叫命令 响应
          break;
        case 0x12: // 启停参数上报响应
          let d = (data[6] & 0xff) == 0x01;
          break;
        case 0x13: // 设置工作参数 响应
          break;
        case 0x14: // 读取工作参数 响应
          let opts = this.resolveConf(data);
          this.options = opts;
          return;
        case 0x15: //
          return this.resolvePacket(data);
      }
    }

    /**
     * 检查是否为响应头
     */
    isResponseHead(data: number[]): boolean {
      return binary.isEquals(RESPONSE_HEAD, 0, data, 0, RESPONSE_HEAD.length);
    }

    /**
     * 验证响应
     *
     * @param data 数据
     * @return 返回验证的结果
     */
    verifyResponse(data: number[]): boolean {
      // 包头 && 校验和
      return this.isResponseHead(data) && checkSum(data) == data[data.length - 1];
    }

    /**
     * 解析读取的配置
     */
    resolveConf(data: number[]): Options {
      return <Options>{
        mode: data[6] & 0xff, // 模式 被动1 主动2 智能被动3 智能主动4
        turnOn: data[7] & 0xff, // 暂停 暂停1 非暂停2 停止3(进入暂停状态并清除累积的里程和时间)
        direction: data[8] & 0xff, // 方向 正向1 反向2
        duration: data[9] & 0xff, // 工作时间-分钟 1-255
        speed: data[10] & 0xff, // 设定速度r/min 1-60
        spasmLevel: data[11] & 0xff, // 设定痉挛等级 1-12
        resistanceOn: data[12] & 0xff, // 智能阻力是否开启 关闭1 开启2
        resistance: data[13] & 0xff, // 设定阻力等级 1-12
      };
    }

    /**
     * 5.	上报工作参数:开启实时参数上报时,下位机工作时每秒上报的内容
     * <p>
     * 命令码:0x15
     * 通讯描述:
     * 根据不同模式上报数据有所不同:
     * a)	主动模式时
     * 模式、方向、倒计时min、倒计时sec、里程低字节、里程高字节、实时速度r/min、实时阻力、左右对称性
     * b)	被动模式时
     * 模式、方向、倒计时min、倒计时sec、里程低字节、里程高字节、实时速度r/min、痉挛次数低字节、痉挛次数高字节
     * c)	智能主动时
     * 模式、方向、倒计时min、倒计时sec、主动里程低字节、主动里程高字节、实时速度r/min、实时阻力、左右对称性、主动时长min、主动时长sec
     * d)	智能被动时
     * 模式、方向、倒计时min、倒计时sec、里程低字节、里程高字节、实时速度r/min、痉挛次数低字节、痉挛次数高字节、被动时长min、被动时长sec
     * <p>
     * 设定参数顺序/上报工作参数顺序
     * <p>
     * 第1字节	模式
     * 第2字节	启停状态
     * 第3字节	方向
     * 第4字节	设定工作时间min
     * 第5字节	设定速度
     * 第6字节	设定痉挛等级
     * 第7字节	智能阻力是否开启
     * 第8字节	设定阻力
     * <p>
     * 实时上传部分
     * 被动模式时	主动模式时	智能被动模式时	智能主动模式时
     * 第1字节	模式（被动1）	模式（主动2）	模式（智能被动3）	模式（智能主动4）
     * 第2字节	方向	方向	方向	方向
     * 第3字节	倒计时min	倒计时min	倒计时min	倒计时min
     * 第4字节	倒计时sec	倒计时sec	倒计时sec	倒计时sec
     * 第5字节	里程低字节	里程低字节	被动里程低字节	主动里程低字节
     * 第6字节	里程高字节	里程高字节	被动里程高字节	主动里程高字节
     * 第7字节	实时速度	实时速度	实时速度	实时速度
     * 第8字节	痉挛次数低字节	实时阻力(%)	痉挛次数低字节	实时阻力(%)
     * 第9字节	痉挛次数高字节	左右对称性	痉挛次数高字节	左右对称性
     * 第10字节	　	　	被动时长min	主动时长min
     * 第11字节	　	　	被动时长sec	主动时长sec
     */
    resolvePacket(data: number[]): Packet {
      let mode = train_modes.find((tm) => tm.type == (data[6] & 0xff));
      if (!mode) {
        throw new Error('无法识别的模式');
      }
      let start = 5;
      let fp = <Packet>{
        mode: mode, // 模式
        modeAlias: mode.name.includes('智能') ? '主被动' : mode.name, // 模式
        direction: data[2 + start], // 方向
        directionAlias: data[2 + start] == 1 ? '正' : '反',
        countDownMinute: data[3 + start] & 0xff, // 倒计时：分钟
        countDownSecond: data[4 + start] & 0xff, // 倒计时：秒
        mileage: binary.bytesToNumber([data[5 + start], data[6 + start]], false, false), // 里程：1:10、3圈1米
        speed: data[7 + start] & 0xff, // 实时速度
      };
      fp.countDown = fp.countDownMinute * 60_000 + fp.countDownSecond * 1000; // 倒计时：毫秒
      switch (mode) {
        case train_mode_passive:
        case train_mode_intelligent_passive:
          if (fp.direction == 2) {
            fp.spasms = binary.bytesToNumber([data[9 + start], data[8 + start]]); // 痉挛次数
          }
          break;
        case train_mode_active:
        case train_mode_intelligent_active:
          fp.resistance = data[8 + start] & 0xff; // 实时阻力
          fp.zygomorphy = data[9 + start] & 0xff; // 左右对称性
          break;
      }
      switch (mode) {
        case train_mode_intelligent_active:
        case train_mode_intelligent_passive:
          fp.initiativeMinute = data[10 + start] & 0xff; // 主动时长min
          fp.initiativeSecond = data[11 + start] & 0xff; // 主动时长sec
          fp.initiativeTime = fp.initiativeMinute * 60_000 + fp.initiativeSecond * 1000;
          break;
      }
      return fp;
    }
  }

  /** 训练模式 */
  export interface H1TrainMode {
    type: number;
    name: string;
    alias: string;
  }

  export const train_mode_passive = <H1TrainMode>{
    type: 0x01,
    name: '被动',
    alias: 'passive',
  };
  export const train_mode_active = <H1TrainMode>{
    type: 0x02,
    name: '主动',
    alias: 'active',
  };
  export const train_mode_intelligent_passive = <H1TrainMode>{
    type: 0x03,
    name: '智能被动',
    alias: 'intelligent_passive',
  };
  export const train_mode_intelligent_active = <H1TrainMode>{
    type: 0x04,
    name: '智能主动',
    alias: 'intelligent_active',
  };
  /**
   * 模式
   */
  export const train_modes = [train_mode_passive, train_mode_active, train_mode_intelligent_passive, train_mode_intelligent_active];

  export const REQUEST_HEAD = [0x4d, 0x2d, 0x3e, 0x53];
  export const RESPONSE_HEAD = [0x4d, 0x3c, 0x2d, 0x53];
  /**
   * 计算校验和
   *
   * @param data 数据
   * @return 返回校验和
   */
  export const checkSum = (data: number[]) => {
    let sum = 0x5a; // 固定值
    for (let i = 4; i < data.length - 1; i++) {
      sum ^= data[i] & 0xff;
    }
    return sum & 0xff;
  };

  /**
   * 帧头标识（4字节)
   * 数据长度（1 字节）
   * 命令码（1 字节）
   * 数据字节（n 字节）
   * 校验字（1 字节）
   *
   * @param type  类型
   * @param payload 数据
   * @return 返回是否发送
   */
  export const wrapCmd = (type: number, ...payload: number[]) => {
    // 0x4D 0x2D 0x3E 0x53 0x01 0x11 0x4A
    // 上位机发送的帧头”M->S”
    let data = new Array(4 + 1 + 1 + payload.length + 1);
    data[0] = 0x4d;
    data[1] = 0x2d;
    data[2] = 0x3e;
    data[3] = 0x53;
    // 数据字节（n 字节）
    data[4] = (payload.length + 1) & 0xff;
    // type
    data[5] = type;
    binary.arraycopy(payload, 0, data, 6, payload.length);
    data[data.length - 1] = checkSum(data);
    return data;
  };

  /**
   * 模式名
   *
   * @param mode 模式类型
   * @returns 返回模式名
   */
  export function modeName(mode: number) {
    let tm = train_modes.find((m) => m.type == mode);
    return tm ? (tm.name.includes('智能') ? '主被动' : tm.name) : '';
  }

  /**
   * 参数
   */
  export interface Options {
    /** 模式：被动1 主动2 智能被动3 智能主动4 */
    mode: number;

    /** 暂停1 非暂停2 停止3(进入暂停状态并清除累积的里程和时间) */
    turnOn: number;
    /** 方向 正向1 反向2 */
    direction: number;

    /** 设定工作时间min，1-255 */
    duration: number;

    /** 设定速度r/min 1-60 */
    speed: number;

    /** 设定痉挛等级 1-12 */
    spasmLevel: number;

    /** 智能阻力是否开启 关闭1 开启2 */
    resistanceOn: number;

    /** 设定阻力等级 1-12 */
    resistance: number;

    // 上下肢主被动训练车
    // /** 训练类型：当前的设置训练类型 上肢垂直交叉0x00，上肢水平训练0x01，上肢垂直平行0x02，下肢0x10 */
    // trainType: number;
  }

  /** H1的数据类型 */
  export interface Packet {
    /** 模式 */
    mode: H1TrainMode;
    /** 模式 */
    modeAlias: string;

    /** 方向 */
    direction: number;
    /** 方向 */
    directionAlias: string;

    /** 倒计时：分钟 */
    countDownMinute: number;

    /** 倒计时：秒 */
    countDownSecond: number;

    /** 倒计时毫秒 */
    countDown: number;

    /** 里程 */
    mileage: number;

    /** 实时速度 */
    speed: number;

    /** 痉挛次数（被动模式/智能被动模式） */
    spasms: number;

    /** 阻力（主动模式/智能主动模式） */
    resistance: number;

    /** 左右对称性（主动模式/智能主动模式） */
    zygomorphy: number;

    /** 主动时长 分钟（主动模式/智能主动模式） */
    initiativeMinute: number;

    /** 主动时长 秒（主动模式/智能主动模式） */
    initiativeSecond: number;

    /** 主动时长 */
    initiativeTime: number;

    /** 卡路里 */
    kcal: number;
  }

  /**
   * 计算卡路里
   *
   * @param weight  体重(kg)
   * @param mileage 里程(km)
   * @return 返回值
   */
  export function calculateKcal(weight: number, mileage: number) {
    // 小数点后2位
    return (Math.floor(weight * (mileage / 1000.0) * 0.51) * 100) / 100.0;
  }

  /**
   * 解析读取的配置
   */
  export const resolveConf = (data: number[]): Options => {
    return <Options>{
      mode: data[6] & 0xff, // 模式 被动1 主动2 智能被动3 智能主动4
      turnOn: data[7] & 0xff, // 暂停 暂停1 非暂停2 停止3(进入暂停状态并清除累积的里程和时间)
      direction: data[8] & 0xff, // 方向 正向1 反向2
      duration: data[9] & 0xff, // 工作时间-分钟 1-255
      speed: data[10] & 0xff, // 设定速度r/min 1-60
      spasmLevel: data[11] & 0xff, // 设定痉挛等级 1-12
      resistanceOn: data[12] & 0xff, // 智能阻力是否开启 关闭1 开启2
      resistance: data[13] & 0xff, // 设定阻力等级 1-12
    };
  };

  /**
   * 5.	上报工作参数:开启实时参数上报时,下位机工作时每秒上报的内容
   * <p>
   * 命令码:0x15
   * 通讯描述:
   * 根据不同模式上报数据有所不同:
   * a)	主动模式时
   * 模式、方向、倒计时min、倒计时sec、里程低字节、里程高字节、实时速度r/min、实时阻力、左右对称性
   * b)	被动模式时
   * 模式、方向、倒计时min、倒计时sec、里程低字节、里程高字节、实时速度r/min、痉挛次数低字节、痉挛次数高字节
   * c)	智能主动时
   * 模式、方向、倒计时min、倒计时sec、主动里程低字节、主动里程高字节、实时速度r/min、实时阻力、左右对称性、主动时长min、主动时长sec
   * d)	智能被动时
   * 模式、方向、倒计时min、倒计时sec、里程低字节、里程高字节、实时速度r/min、痉挛次数低字节、痉挛次数高字节、被动时长min、被动时长sec
   * <p>
   * 设定参数顺序/上报工作参数顺序
   * <p>
   * 第1字节	模式
   * 第2字节	启停状态
   * 第3字节	方向
   * 第4字节	设定工作时间min
   * 第5字节	设定速度
   * 第6字节	设定痉挛等级
   * 第7字节	智能阻力是否开启
   * 第8字节	设定阻力
   * <p>
   * 实时上传部分
   * 被动模式时	主动模式时	智能被动模式时	智能主动模式时
   * 第1字节	模式（被动1）	模式（主动2）	模式（智能被动3）	模式（智能主动4）
   * 第2字节	方向	方向	方向	方向
   * 第3字节	倒计时min	倒计时min	倒计时min	倒计时min
   * 第4字节	倒计时sec	倒计时sec	倒计时sec	倒计时sec
   * 第5字节	里程低字节	里程低字节	被动里程低字节	主动里程低字节
   * 第6字节	里程高字节	里程高字节	被动里程高字节	主动里程高字节
   * 第7字节	实时速度	实时速度	实时速度	实时速度
   * 第8字节	痉挛次数低字节	实时阻力(%)	痉挛次数低字节	实时阻力(%)
   * 第9字节	痉挛次数高字节	左右对称性	痉挛次数高字节	左右对称性
   * 第10字节	　	　	被动时长min	主动时长min
   * 第11字节	　	　	被动时长sec	主动时长sec
   */
  export const resolvePacket = (data: number[]): Packet => {
    let mode = train_modes.find((tm) => tm.type == (data[6] & 0xff));
    if (!mode) {
      throw new Error('无法识别的模式');
    }
    let start = 5;
    let fp = <Packet>{
      mode: mode, // 模式
      modeAlias: mode.name.includes('智能') ? '主被动' : mode.name, // 模式
      direction: data[2 + start], // 方向
      directionAlias: data[2 + start] == 1 ? '正' : '反',
      countDownMinute: data[3 + start] & 0xff, // 倒计时：分钟
      countDownSecond: data[4 + start] & 0xff, // 倒计时：秒
      mileage: binary.bytesToNumber([data[5 + start], data[6 + start]], false, false), // 里程：1:10、3圈1米
      speed: data[7 + start] & 0xff, // 实时速度
    };
    fp.countDown = fp.countDownMinute * 60_000 + fp.countDownSecond * 1000; // 倒计时：毫秒
    switch (mode) {
      case train_mode_passive:
      case train_mode_intelligent_passive:
        if (fp.direction == 2) {
          fp.spasms = binary.bytesToNumber([data[9 + start], data[8 + start]]); // 痉挛次数
        }
        break;
      case train_mode_active:
      case train_mode_intelligent_active:
        fp.resistance = data[8 + start] & 0xff; // 实时阻力
        fp.zygomorphy = data[9 + start] & 0xff; // 左右对称性
        break;
    }
    switch (mode) {
      case train_mode_intelligent_active:
      case train_mode_intelligent_passive:
        fp.initiativeMinute = data[10 + start] & 0xff; // 主动时长min
        fp.initiativeSecond = data[11 + start] & 0xff; // 主动时长sec
        fp.initiativeTime = fp.initiativeMinute * 60_000 + fp.initiativeSecond * 1000;
        break;
    }
    return fp;
  };
}

/**
 * 上下肢主被动训练车
 */
export namespace a4 {
  /**
   * UUID
   */
  export const uuid = <GattUUID>{
    service: '0000a002-0000-1000-8000-00805f9b34fb',
    readCharacteristic: '0000c305-0000-1000-8000-00805f9b34fb',
    notifyCharacteristic: '0000c305-0000-1000-8000-00805f9b34fb',
    writeCharacteristic: '0000c304-0000-1000-8000-00805f9b34fb',
    readDescriptor: '00002902-0000-1000-8000-00805f9b34fb',
    mtu: 512,
  };

  export class Device implements IDevice {
    readonly buf = new ByteBuf();

    readonly uuid = uuid;

    addBuf(value?: number[]): number[] | undefined {
      let buf = this.buf;
      if (value && value.length > 0) {
        buf.write(value);
      }
      // 55 1200 00 00 2100 00000100000000000032 68
      // 55 包头 1字节 0
      // 1200 长度 2字节，小端 1~2
      // 00 代码，或校验信息 可不用 3
      // 00 版本号，无用  4
      // 2100 类型，2字节，小端  5~6
      // 00000100000000000032 数据 7~n
      // 68 结束，固定值：0x68 n+1
      while (buf.size() > 4) {
        let index = buf.find([0x55]);
        if (index >= 0) {
          if (index > 0) {
            // 丢弃无用的数据
            buf.read(0, index);
            continue;
          }
          let segment = buf.read(0, 4, false);
          let len = binary.bytesToNumber([segment[1], segment[2]], false);
          if (buf.size() >= len) {
            segment = buf.read(0, len);
            return segment;
          }
        } else {
          buf.clear(); // 丢弃
        }
      }
    }
  }

  /**
   * 发送状态
   *
   * @param state 状态：2-开始、3-暂停、4-停止
   * @returns
   */
  export const stateCmd = (state: number): number[] => {
    let data = new Array(9);
    binary.arraycopy(PASSWORD, 0, data, 0, PASSWORD.length);
    data[data.length - 1] = state;
    return wrapCmd(0x40, data);
  };

  /**
   * 解析
   *
   * @param deviceId 设备ID
   * @param value 数据
   */
  export const resolve = (value: number[]) => {
    let payload: number[],
      packet: Packet | undefined = undefined;
    switch (value[5] & 0xff) {
      case 0x21:
        payload = getPayload(value);
        packet = <Packet>{
          packetType: PacketType.WORK_PARAM,
          state: states.find((v) => v.flag == (payload[0] & 0xff)),
          type: types.find((v) => v.flag == (payload[1] & 0xff)),
        };
        if (packet.state?.name != 'before' && packet.state?.name != 'finish') {
          // 未进入训练界面
          utils.copyAttrs(
            {
              mode: modes.find((v) => v.flag == (payload[2] & 0xff)),
              duration: binary.bytesToNumber([payload[3], payload[4]]),
              speed: payload[5] & 0xff,
              direction: payload[6] == 1 ? '反' : '正',
              resistance: payload[7] & 0xff,
              spasms: (payload[8] & 0xff) > 0 ? payload[8] & 0xff : undefined,
              zygomorphy: payload.length >= 10 ? payload[9] & 0xff : undefined,
            },
            packet,
          );
        }
        break;
      case 0x23:
        payload = getPayload(value);
        packet = <Packet>{
          packetType: PacketType.SETTINGS_PARAM,
          state: states.find((v) => v.flag == (payload[0] & 0xff)),
          type: types.find((v) => v.flag == (payload[1] & 0xff)),
          duration: binary.bytesToNumber([payload[2], payload[3]]),
          speed: payload[4] & 0xff,
          direction: payload[5] == 1 ? '反' : '正',
          resistance: payload[6] & 0xff,
        };
        break;
      case 0x25:
        payload = getPayload(value);
        packet = <Packet>{
          packetType: PacketType.TRAIN_RESULT,
          state: states.find((v) => v.flag == (payload[0] & 0xff)),
          mileage: binary.bytesToNumber([payload[1], payload[2]], false) * 10,
          energy: binary.bytesToNumber([payload[3], payload[4]], false),
          muscleTone: binary.bytesToNumber([payload[5], payload[6]], false),
          muscleToneMin: binary.bytesToNumber([payload[6], payload[7]], false),
          muscleToneMax: binary.bytesToNumber([payload[8], payload[9]], false),
          spasms: (payload[10] & 0xff) > 0 ? payload[10] & 0xff : undefined,
          zygomorphy: (payload[11] & 0xff) > 0 ? payload[11] & 0xff : undefined,
        };
        break;
    }
    return packet;
  };

  /**
   * 获取有效数据
   *
   * @param data 数据
   * @return 返回数据
   */
  export const getPayload = (data: number[] | Uint8Array | ArrayBuffer): number[] => {
    // 55 1200 00 00 2100 00000100000000000032 68
    // 55 包头 1字节
    // 1200 长度 2字节，小端
    // 00 代码，或校验信息 可不用
    // 00 版本号，无用
    // 2100 类型，2字节，小端
    // 00000100000000000032 数据
    // 68 结束，固定值：0x68
    data = binary.asNumberArray(data);
    return data.slice(7, data.length - 8);
  };

  export const PASSWORD = binary.hexToBytes('666F7572696572'); // fourier

  /**
   * 帧头标识（2字节)
   * 数据长度（2 字节）
   * 命令码（1 字节）
   * 数据字节（n 字节）
   * 结束，固定值：0x68（1 字节）
   *
   * @param type    类型
   * @param payload 数据
   * @return 返回是否发送
   */
  function wrapCmd(type: number, payload: number[]) {
    // 数据大小, (包头 + 数据长度 + 包尾)
    let data = new Array(1 + 2 + 1 + 1 + 2 + payload.length + 1);
    data.fill(0x00, 0, data.length);
    data[0] = 0x55;
    let length = binary.numberToBytes(data.length, 16, false);
    data[1] = length[0];
    data[2] = length[1];
    // 校验代码
    data[3] = 0x00; //代码，或校验信息 可不用
    data[4] = 0x00; //版本，可不用
    // 协议类型 short
    data[5] = type;
    data[6] = 0x00;
    // 数据
    binary.arraycopy(payload, 0, data, 7, payload.length);
    data[data.length - 1] = 0x68;
    return data;
  }

  /**
   * 模式
   */
  export interface TrainMode {
    /**
     * 标志
     */
    flag: number;
    /**
     * 名称
     */
    name: string;
  }
  export const modes = <TrainMode[]>[
    { flag: 0x01, name: '智能被动' },
    { flag: 0x02, name: '智能主动' },
    { flag: 0x10, name: '被动' },
    { flag: 0x20, name: '主动' },
  ];

  /**
   * 训练类型
   */
  export interface Type {
    /**
     * 标志
     */
    flag: number;
    /**
     * 名称
     */
    name: string;
  }

  // 类型
  export const types = <Type[]>[
    { flag: 0x00, name: '上肢垂直交叉训练' },
    { flag: 0x01, name: '上肢水平训练' },
    { flag: 0x02, name: '上肢垂直平行训练' },
    { flag: 0x10, name: '下肢训练训练' },
  ];

  /**
   * 设备状态
   */
  export interface State {
    /**
     * 类型
     */
    flag: number;
    /**
     * 别名
     */
    type: string;
    /**
     * 名称
     */
    name: string;
  }
  // 类型
  export const states = <State[]>[
    { flag: 0, type: 'before', name: '未进入训练界面' },
    { flag: 1, type: 'ready', name: '在训练界面准备开始' },
    { flag: 2, type: 'running', name: '训练中' },
    { flag: 3, type: 'pause', name: '暂停训练' },
    { flag: 4, type: 'finish', name: '结束训练(报告界面)' },
  ];

  /**
   * 数据包类型
   */
  export enum PacketType {
    /* 实时数据  */
    WORK_PARAM = '实时数据',
    /* 设置参数 */
    SETTINGS_PARAM = '设置参数',
    /* 训练结果 */
    TRAIN_RESULT = '训练结果',
  }

  /**
   * 解析的数据包
   */
  export interface Packet {
    /** 数据包类型 */
    packetType: PacketType;

    /** 设备状态：0-未进入训练界面，1-在训练界面准备开始，2-训练中，3-暂停训练，4-结束训练(报告界面) */
    state: State;

    /** 训练类型 （ 上肢垂直交叉0x00，上肢水平训练0x01，上肢垂直平行0x02，下肢0x10） */
    type: Type;

    /** 训练模式（ 主被动训练下的被动 0x01，主被动训练下的主动 0x02，被动训练 0x10, 主动训练 0x20） */
    mode: TrainMode;

    /** 当前的设置训练时间，时间单位：s */
    duration: number;

    /** 当前的设置速度 转/分钟 */
    speed: number;

    /** 当前的设置方向：0:正（-1:反） */
    direction: string;

    /** 当前的设置阻力：级（不同等级对应不同阻力，但是阻力大小未确定） */
    resistance: number;

    /** SN */
    sn: number;

    /** 设备名称 */
    deviceName: string;

    /** 里程，单位：0.01km */
    mileage: number;

    /** 能量消耗，单位：J */
    energy: number;

    /** 肌张力：单位：N */
    muscleTone: number;

    /** 肌张力最小：单位：N */
    muscleToneMin: number;

    /** 肌张力最大：单位：N */
    muscleToneMax: number;

    /** 痉挛次数,单位：次 */
    spasms: number;

    /** 实时对称性：单位%（注：1-99代表左边的力气占比） */
    zygomorphy: number;
  }
}
