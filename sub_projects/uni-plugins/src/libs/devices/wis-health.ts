import { ByteBuf, CRC16, binary, utils } from "@benefitjs/core";
import { bluetooth } from '../uni/bluetooth';
import { uniapp } from '../uni/uniapp';

/**
 * 智益康：呼吸训练器
 */
export namespace WisHealth {

  /**
   * 蓝牙名
   */
  const WIS_HEALTH_NAME = <uniapp.BluetoothDevice>{
    deviceId: '38:3B:26:1A:27:5B',
    name: 'ZYK-Z1-01',
    RSSI: -70,
    localName: 'ZYK-Z1-01',
    advertisServiceUUIDs: [],
    advertisData: {},
  };

  const WH_PATTERN = { prefix: [0x7b], suffix: [0x7d, 0x0d, 0x0a] };
  /**
   * 呼吸训练器
   */
  export class Client extends bluetooth.BluetoothClient<Client> {
    /**
     * 定时读取
     */
    private _readTimer: any;
    /**
     * 当前正在执行的读入指令状态
     */
    readCmd: Cmd = cmd_exit;
    /**
     * 读取长度
     */
    readSize: number = 0;
    /**
     * 当前正在执行的写入指令状态
     */
    writeCmd: Cmd = cmd_exit;
    /**
     * 要求通过验证
     */
    requireVerify: boolean = true;
    /**
     * 上次记录
     */
    _startPacket?: Packet;
    _lastPacket?: Packet;
    _lastTimes: number = -1;

    /**
     * 数据处理
     */
    private readonly _handler = <uniapp.OnBleClientListener<Client>>{
      onConnected(client, deviceId) {
        client.resetBuf();
        client.print(`呼吸训练器已连接: ${deviceId}`);
      },

      onServiceDiscover(client, deviceId, services) {
        // 无论之前是什么状态，重新连接之后需要退出当前状态，避免测量的指令下发失败(即使加上了也会出现下发同一条指令不起作用的情况)
        let count = 0;
        let exitTimerId: any = 0;
        exitTimerId = setInterval(() => {
          if (count < 20) {
            // 尝试20次就不再发送
            client
              .sendExitCmd()
              .then((resp: any) => {
                if (resp.successful) {
                  clearInterval(exitTimerId);
                }
              });
            count++;
          } else {
            clearInterval(exitTimerId);
          }
        }, 1000);
      },

      onDisconnected(client, deviceId, auto) {
        client.resetBuf();
        // 移除定时读取的操作
        client.stopReadTimer();
        client.print(`呼吸训练器已断开: ${deviceId}`);
      },

      onCharacteristicWrite(client, deviceId, value) {
        let hex = binary.bytesToHex(value);
        let op = value[1] & 0xff;
        let address = binary.bytesToNumber([value[2], value[3]]);
        let payload = binary.bytesToNumber([value[4], value[5]]);
        if (op == OpType.read) {
          let r_cmd = findCmd((cmd) => cmd.readAddress == address);
          if (r_cmd) {
            client.readCmd = r_cmd; // 读取指令
            client.readSize = payload; // 读取长度
          }
          client.print(`发送读取指令[${deviceId}]: ${hex}, cmd: ${r_cmd?.description}, readCmd: ${client.readCmd?.description}, readSize: ${client.readSize}`);
        } else {
          let w_cmd = findCmd((cmd) => cmd.writeAddress == address && cmd.writePayload == payload);
          if (w_cmd && (w_cmd.type == cmd_exit.type || w_cmd.autoRead)) {
            client.writeCmd = w_cmd;
            if (w_cmd.type == cmd_exit.type) {
              client.stopReadTimer();
            } else {
              let interval = 1000;
              switch (w_cmd.type) {
                case cmd_exhale_assess.type:
                case cmd_inhale_assess.type:
                  interval = 500;
                  break;
                case cmd_exhale_train.type:
                case cmd_inhale_train.type:
                  interval = 200;
                  break;
                case cmd_lip_girdle_train.type:
                  break;
                default:
                  return; // 其他的指令不支持
              }
              client.startReadTimer(w_cmd, interval);
            }
            client.print(`发送写入指令[${deviceId}]: ${hex}, cmd: ${w_cmd?.description}, writeCmd: ${client.writeCmd?.description}`);
          }
        }
      },

      onCharacteristicChanged(client, _deviceId, value, _resp) {
        let buf = client.buf;
        // 缓存到数组中
        buf.write(value);
        let startFlag = buf.find(WH_PATTERN.prefix);
        if (startFlag < 0) {
          client.resetBuf(); // 找不到开始的标记，丢弃数据
          return;
        }
        let endFlag = buf.find(WH_PATTERN.suffix);
        // 尝试解析数据
        if (startFlag >= 0 && endFlag > startFlag) {
          client.resolveData(buf);
        } else {
          if (endFlag >= 0) {
            client.resetBuf(); // 找到开始和结束的标记，但是结束的标记比开始的标记小，说明数据错误，丢弃数据
          }
        }
      },
    };

    /**
     * 呼吸训练器客户端的构造函数
     * 
     * @param autoConnect 是否自动连接
     * @param useNative 是否使用本地插件(如果支持)
     */
    constructor(autoConnect: boolean = false, useNative = false) {
      super(<uniapp.GattUUID>{
        service: '0000fff0-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000fff1-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000fff2-0000-1000-8000-00805f9b34fb',
        notifyCharacteristic: '0000fff1-0000-1000-8000-00805f9b34fb',
        readDescriptor: '00002902-0000-1000-8000-00805f9b34fb',
        writeDescriptor: '00002901-0000-1000-8000-00805f9b34fb',
      }, autoConnect, useNative);
      // 添加监听，处理数据
      this.addListener(this._handler);
    }

    /**
     * 开始定时读取
     */
    protected startReadTimer(cmd: Cmd, interval: number = 1000) {
      this.stopReadTimer();
      // 定时发送读取指令
      this._lastTimes = -1;
      this._startPacket = undefined;
      this._lastPacket = undefined;
      let timerId: number;
      timerId = setInterval(() => {
        if (this.isConnected) {
          if (this._readTimer === timerId) {
            this.write(this.cmd(OpType.read, cmd));
          } else {
            clearInterval(timerId);
          }
        } else {
          // 设备断开了，需要停止此次发送
          this.stopReadTimer();
          clearInterval(timerId);
        }
      }, interval);
      this._readTimer = timerId;
    }

    /**
     * 停止定时读取
     */
    protected stopReadTimer() {
      if (this._readTimer) {
        clearInterval(this._readTimer);
        this._readTimer = null;
        this._startPacket = undefined;
        this._lastPacket = undefined;
        this._lastTimes = -1;
      }
      // 退出读取了，清空本地的缓存；
      this.resetBuf();
    }

    protected resetBuf() {
      if (this.buf.size() > 0) {
        this.print(`resetBuf size[${this.buf.size()}] ==>: ${binary.bytesToHex(this.buf.read())}`);
      }
      this.buf.clear();
    }

    protected resolveData(buf: ByteBuf) {
      buf = buf ? buf : this.buf;
      // 尝试读取，如果不符合数据规则，就丢弃
      for (;;) {
        let start = buf.find(WH_PATTERN.prefix, 0);
        let end = buf.find(WH_PATTERN.suffix, 1);
        if (start >= 0 && end > start) {
          let data = buf.read(0, end + WH_PATTERN.suffix.length);
          // 真正的有效数据段
          let payload = getPayload(data);
          // 解析数据
          //print(`待解析, packet: ${binary.bytesToHex(data)}, data: ${binary.bytesToHex(payload)}`);
          this.resolvePacket(data, payload);
          continue; // 继续下一次的迭代
        }

        // 丢弃无用的数据
        if (buf.size() > 0) {
          let len = start >= 0 ? Math.max(start, 1) : buf.size();
          let discard = buf.read(0, len);
          this.print(`(resolveData)丢弃数据: buf.size[${buf.size()}], discard.size[${discard.length}] =>: ${binary.bytesToHex(discard)}`);
          continue;
        }
        return; // 退出循环
      }
    }

    /**
     * 解析数据包
     *
     * @param data 数据
     * @param payload 有效的数据载荷
     * @param cmd 指令类型
     */
    protected resolvePacket(data: number[], payload: number[] = getPayload(data), cmd?: Cmd) {
      cmd = cmd ? cmd : this.readCmd;
      if (cmd.type != cmd_exit.type) {
        let packet = parse(data, payload, cmd);
        if (packet) {
          // 检测数据的有效性
          switch (cmd.type) {
            case cmd_inhale_assess.type:
            case cmd_exhale_assess.type:
              packet.validate = packet.maxPressure! > 0 && this._lastTimes >= 0 && packet.times !== this._lastTimes;
              this._lastTimes = packet.times;
              if (!packet.validate) {
                this.print('无效数据: ' + JSON.stringify(packet));
                if (this.requireVerify) {
                  return;
                }
              }
              break;
            case cmd_inhale_train.type:
            case cmd_exhale_train.type:
              packet.validate =  packet.pressure > 1;
              let sp = this._startPacket;
              if (!(sp || packet.validate)) { // 无效数据
                if (this.requireVerify) {
                  this.print('无效数据: ' + JSON.stringify(packet));
                  return;
                }
              } else {
                if (!sp || sp.times !== packet.times) {
                  if (sp) { // 有开始的数据包
                    // 结束
                    let lp = this._lastPacket!!;
                    lp.onceDuration = lp.time - sp.time;
                    sp.maxPressure = Math.max(sp.pressure, lp.pressure);
                    lp.maxPressure = sp.maxPressure;
                    lp.times = sp.times;
                    lp.flag = 'end';
                    this._startPacket = undefined;
                    this.callListeners<Listener>((l) => l.onData(this, data, lp), (l) => l && (l as any).onData);
                    if (!packet.validate) {
                      this.print('无效数据: ' + JSON.stringify(packet));
                      return; // 无效数据，直接返回
                    }
                  }
                  this._startPacket = (sp = packet);
                  packet.flag = 'start';
                }
                packet.onceDuration = packet.time - sp.time;
                sp.maxPressure = Math.max(sp.pressure, packet.pressure);
                packet.maxPressure = sp.maxPressure;

                if ((sp.times + 1) == packet.times) {
                  // 结束
                  this._startPacket = undefined;
                  packet.flag = 'end';
                  packet.times = sp.times;
                  sp = undefined;
                }

                this._lastPacket = packet; // 最后一个包

                if (!packet.validate && this.requireVerify) {
                  return;
                }
              }
              break;
            case cmd_lip_girdle_train.type:
              break;
          }
        }
        this.callListeners<Listener>((l) => l.onData(this, data, packet), (l) => l && (l as any).onData);
      } else if (data.length >= 22) {
        this.callListeners<Listener>((l) => l.onData(this, data, undefined), (l) => l && (l as any).onData);
      }
    }

    /**
     * 读取编译时间和程序版本
     */
    sendCompileTimeAndVersion() {
      return this.write(this.cmd(OpType.read, cmd_compile_time_and_version));
    }

    /**
     * 读取实时压力
     */
    sendPressure() {
      return this.write(this.cmd(OpType.read, cmd_pressure));
    }

    /**
     * 读取仪器状态
     */
    sendStatus() {
      return this.write(this.cmd(OpType.read, cmd_status));
    }

    /**
     * 发送 退出当前模式 指令
     */
    sendExitCmd(): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, cmd_exit));
    }

    /**
     * 发送 呼气肌力评估 指令
     */
    sendExhaleAssessCmd(): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, cmd_exhale_assess));
    }

    /**
     * 发送 吸气肌力评估 指令
     */
    sendInhaleAssessCmd(): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, cmd_inhale_assess));
    }

    /**
     * 发送 呼气肌力训练 指令
     */
    sendExhaleTrainCmd(): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, cmd_exhale_train));
    }

    /**
     * 发送 吸气肌力训练 指令
     */
    sendInhaleTrainCmd(): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, cmd_inhale_train));
    }

    /**
     * 发送 缩唇呼吸训练 指令
     */
    sendLipGirdleTrainCmd(): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, cmd_lip_girdle_train));
    }

    /**
     * 发送 设置阻力 指令
     */
    sendResistanceCmd(value: number): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, utils.copyAttrs(cmd_resistance, { writePayload: value })));
    }

    /**
     * 发送 设置缩唇呼吸档位 指令
     */
    sendSetGearsCmd(value: number): Promise<uniapp.UniResponse> {
      return this.write(this.cmd(OpType.write, utils.copyAttrs(cmd_gears, { writePayload: value })));
    }

    /**
     * 转换成指令
     *
     * @param op 类型: 0x03(读)、0x06(写单个寄存器指令) 、0x10（写多个寄存器指令，浮点数必须使用此指令）
     * @param cmd 指令类型
     * @returns 返回数值
     */
    cmd(op: OpType, cmd: Cmd): Array<number> | number[] {
      // 发送指令
      // [数据长度8 bit)+命令(8 bit)+数据地址(16 bit)+ 数据数量16 bit)+CRC 校验(16bit\r\n，
      //  数据皆为 BIN16 进制。“{”为开始标志 (0x7B),“}\r\n”为结束标志(0x7D 0x0D 0x0A)
      // {}\r\n =>: 1字节{ + 命令(1) + 地址(2) + payload.length  + CRC(2) + 3字节的}\r\n
      let payload = <Array<number>>[];
      let address: number = 0;
      switch (op) {
        case OpType.read:
          address = cmd.readAddress;
          payload = binary.numberToBytes(cmd.readPayload, 16);
          break;
        case OpType.write:
        case OpType.write2:
          address = cmd.writeAddress;
          payload = binary.numberToBytes(cmd.writePayload, 16);
          break;
      }
      let data = new Array<number>(1 + 1 + 2 + payload.length + 2 + 3);
      data[0] = 0x7b;
      data[1] = op;
      let addressBytes = binary.numberToBytes(address, 16);
      data[2] = addressBytes[0];
      data[3] = addressBytes[1];
      // copy payload
      binary.arraycopy(payload, 0, data, 4, payload.length);
      // CRC，第0个开始，到校验和之前
      let crc = CRC16(data, 0, data.length - 5, false);
      data[data.length - 5] = crc[0];
      data[data.length - 4] = crc[1];
      // }\r\n
      data[data.length - 3] = 0x7d;
      data[data.length - 2] = 0x0d;
      data[data.length - 1] = 0x0a;
      return data;
    }
  }

  /**
   * 获取有效数据
   *
   * @param data 数据
   * @returns 返回截取后的有效数据
   */
  export function getPayload(data: number[]): number[] {
    return data.slice(3, data[2] & 0xff);
  }

  /**
   * 解析数据
   *
   * @param data 数据
   * @param payload 有效数据载荷
   * @param cmd 指令
   * @returns 返回解析后的数据包
   */
  export function parse(data: number[], payload = getPayload(data), cmd: Cmd): Packet | undefined {
    // 解析
    let packet: Packet | undefined;
    switch (cmd.type) {
      case cmd_exhale_assess.type: // 呼气肌力评估
      case cmd_inhale_assess.type: // 吸气肌力评估
        packet = <Packet>{
          data: binary.bytesToHex(data),
          type: cmd.type,
          cmdAlias: cmd.description,
          times: binary.bytesToNumber([payload[0], payload[1]]), // 次数
          duration: binary.bytesToNumber([payload[2], payload[3]]), // 时长
          maxPressure: binary.hexToFloat32(binary.bytesToHex([payload[4], payload[5], payload[6], payload[7]]), 2), // 最大压力
          pressure: binary.hexToFloat32(binary.bytesToHex([payload[8], payload[9], payload[10], payload[11]]), 4), // 实时压力
          step: binary.bytesToNumber([payload[12], payload[13]]), // 状态
        };
        break;
      case cmd_exhale_train.type: // 呼气肌力训练
      case cmd_inhale_train.type: // 吸气肌力训练
        packet = <Packet>{
          data: binary.bytesToHex(data),
          type: cmd.type,
          cmdAlias: cmd.description,
          times: binary.bytesToNumber([payload[0], payload[1]]),
          duration: binary.bytesToNumber([payload[2], payload[3]]),
          resistance: binary.hexToFloat32(binary.bytesToHex([payload[4], payload[5]]), 2),
          pressure: binary.hexToFloat32(binary.bytesToHex([payload[6], payload[7], payload[8], payload[9]]), 4),
          step: binary.bytesToNumber([payload[10], payload[11]]),
          onceDuration: binary.bytesToNumber([payload[12], payload[13]]), // 单次呼吸时间
        };
        if(cmd.type === cmd_inhale_train.type) {
          packet.pressure = -packet.pressure; // 如果是呼气，为负值，这里取正
        }
        break;
      case cmd_lip_girdle_train.type: // 缩唇呼吸训练
        packet = <Packet>{
          data: binary.bytesToHex(data),
          type: cmd.type,
          cmdAlias: cmd.description,
          times: binary.bytesToNumber([payload[0], payload[1]]), // 次数
          duration: binary.bytesToNumber([payload[2], payload[3]]), // 时长
          resistance: binary.hexToFloat32(binary.bytesToHex([payload[4], payload[5]]), 2), // 阻力
          pressure: binary.hexToFloat32(binary.bytesToHex([payload[6], payload[7], payload[8], payload[9]]), 4), // 实时压力
          step: binary.bytesToNumber([payload[10], payload[11]]), // 状态
        };
        break;
    }
    if (packet) {
      packet.time = Date.now();
    }
    return packet;
  }

  /**
   * 呼吸训练器监听
   */
  export interface Listener extends uniapp.OnBleClientListener<Client> {
    /**
     * 接收到数据
     *
     * @param client 客户端
     * @param data 字节数据
     * @param packet 数据包(可能无法解析)
     */
    onData(client: Client, data: number[], packet?: Packet): void;
  }

  /**
   * 操作类型
   */
  export enum OpType {
    read = 0x03, // 读
    write = 0x06, // 写
    write2 = 0x10, // 浮点数
  }

  /**
   * 指令格式
   */
  export class Cmd {
    /**
     * 指令格式
     *
     * @param type  指令类型
     * @param description 描述
     * @param writeAddress 写入地址
     * @param writePayload 写入载荷
     * @param readAddress 读取地址
     * @param readPayload 读取长度
     * @param autoRead 是否需要发送读取反馈
     */
    constructor(
      public type: string, // 指令类型
      public description: string, // 描述
      public writeAddress: number = 0, // 写入地址
      public writePayload: number = 0, // 写入载荷(指令类型)
      public readAddress: number = 0, // 读取地址
      public readPayload: number = 0, // 读取载荷(长度)
      public autoRead = false, // 是否需要发送读取反馈
    ) { }
  }

  /**
   * 编译时间和版本
   */
  export const cmd_compile_time_and_version = new Cmd('compile_time_and_version', '编译时间和版本', undefined, undefined, 0, 4);
  /**
   * 实时压力
   */
  export const cmd_pressure = new Cmd('pressure', '实时压力', undefined, undefined, 6, 4);
  /**
   * 仪器状态
   */
  export const cmd_status = new Cmd('status', '仪器状态', undefined, undefined, 8, 2);
  /**
   * 退出当前模式
   */
  export const cmd_exit = new Cmd('exit', '退出当前模式', 100, 0, undefined, undefined);
  /**
   * 呼气肌力评估模式
   */
  export const cmd_exhale_assess = new Cmd('exhale_assess', '呼气肌力评估模式', 100, 111, 10, 7, true);
  /**
   * 吸气肌力评估模式
   */
  export const cmd_inhale_assess = new Cmd('inhale_assess', '吸气肌力评估模式', 100, 112, 18, 7, true);
  /**
   * 呼气肌力训练
   */
  export const cmd_exhale_train = new Cmd('exhale_train', '呼气肌力训练', 100, 121, 62, 7, true);
  /**
   * 吸气肌力训练
   */
  export const cmd_inhale_train = new Cmd('inhale_train', '吸气肌力训练', 100, 122, 69, 7, true);
  /**
   * 吸气肌力评估模式
   */
  export const cmd_lip_girdle_train = new Cmd('lip_girdle_train', '吸气肌力评估模式', 100, 123, 76, 6, true);
  /**
   * 阻力
   */
  export const cmd_resistance = new Cmd('resistance', '阻力', 151, undefined, undefined, undefined, false);
  /**
   * 缩唇呼吸档位
   */
  export const cmd_gears = new Cmd('gears', '缩唇呼吸档位', 152, undefined, undefined, undefined, false);

  // 全部的指令
  export const cmds = [
    cmd_compile_time_and_version,
    cmd_pressure,
    cmd_status,
    cmd_exit,
    cmd_exhale_assess,
    cmd_inhale_assess,
    cmd_exhale_train,
    cmd_inhale_train,
    cmd_lip_girdle_train,
    cmd_resistance,
    cmd_gears,
  ];

  /**
   * 查找指令
   */
  export const findCmd = (predicate: (cmd: Cmd) => boolean) => {
    for (let i = 0; i < cmds.length; i++) {
      if (predicate(cmds[i])) {
        return cmds[i];
      }
    }
    return undefined;
  };

  /**
   * 解析后的数据包
   */
  export interface Packet {
    /**
     * 原数据
     */
    data: string;
    /**
     * 指令类型
     */
    type: string;
    /**
     * 指令描述
     */
    cmdAlias: string;
    /**
     * 时间
     */
    time: number;
    /**
     * 评估次数: 2字节
     */
    times: number;
    /**
     * 时长
     */
    duration: number;
    /**
     * 单次时长
     */
    onceDuration: number;
    /**
     * 最大压力
     */
    maxPressure?: number;
    /**
     * 实时压力
     */
    pressure: number;
    /**
     * 仪器状态 第一次评估、第二次评估、第三次(维持 3秒), 5的时候为结果, 7 的时候为最终结果
     */
    status: number;
    /**
     * 抗阻: 0~260
     */
    resistance: number;
    /**
     * 当前步骤: 0 训练准备、1 仪器就绪、2 正在训练、3 训练结束
     */
    step: number;
    /**
     * 档位：1~6
     */
    gears: number;
    /**
     * 是否有效
     */
    validate: boolean;
    /**
     * 标记：start-开始、end-结束
     */
    flag: string;
  }
}
