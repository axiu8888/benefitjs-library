import { CRC16, binary, utils } from "@benefitjs/core";
import { bluetooth } from '../uni/bluetooth';
import { uniapp } from '../uni/uniapp';

/**
 * 星脉：蓝牙血压计
 */
export namespace v3 {
  const uniProxy = uniapp.uniProxy;

  const device = <uniapp.BluetoothDevice>{
    deviceId: 'BA:03:18:77:70:04',
    name: 'V03 ',
    RSSI: -56,
    localName: 'V03\r\n',
    advertisServiceUUIDs: ['000003C1-0000-1000-8000-00805F9B34FB'],
    advertisData: {},
  };

  const HEAD = [0x5a];

  /**
   * 客户端
   */
  export class Client extends bluetooth.BluetoothClient<Client> {
    /**
     * 调用超时时长
     */
    timeout: number = 2000;
    /**
     * 是否休眠，默认休眠
     */
    dormancy: boolean = true;
    /**
     * 异步调用处理
     */
    private readonly calls = new Map<number, Set<V3Call>>();
    /**
     * 最近一次接收数据包的操作
     */
    private lastRcv = 0;
    private lastBatteryRcv = 0; // 电池电量

    /**
     * 处理各种状态
     */
    private readonly _handler = <uniapp.OnBleClientListener<Client>>{
      onCharacteristicChanged(client, deviceId, value, resp) {
        client.updateDormancy(); // 更新休眠状态

        let buf = client.buf;
        buf.write(value);
        while (buf.size() >= 5) {
          let start = buf.find(HEAD);
          if (start >= 0) {
            let segment = buf.read(0, 5, false);
            let len = segment[1] & 0xff;
            if (buf.size() >= len) {
              segment = buf.read(0, len);
              client.resolvePacket(deviceId, segment);
            } else {
              return; // 中止循环
            }
          } else {
            buf.clear(); // 清空错误数据
            return;
          }
        }
      },
    };

    /**
     * v3客户端的构造函数
     * 
     * @param autoConnect 是否自动连接
     * @param useNative 是否使用本地插件(如果支持)
     */
    constructor(autoConnect: boolean = false, useNative = false) {
      super(<uniapp.GattUUID>{
        service: '0000ffe0-0000-1000-8000-00805f9b34fb',
        readService: '0000ffe0-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000ffe4-0000-1000-8000-00805f9b34fb',
        writeService: '0000FFE5-0000-1000-8000-00805F9B34FB',
        writeCharacteristic: '0000ffe9-0000-1000-8000-00805f9b34fb',
        notifyCharacteristic: '0000ffe4-0000-1000-8000-00805f9b34fb',
        mtu: 512,
      }, autoConnect, useNative);
      this.addListener(this._handler);
    }

    /**
     * 解析数据包
     *
     * @param deviceId 设备ID
     * @param data 数据
     */
    protected resolvePacket(deviceId: string, data: number[]): void {
      try {
        let cmd = getCmd(data[2])!!;
        let packet = cmd.parser ? cmd.parser(data) : undefined;
        if (cmd.type == 0x0c) {
          // 去除重复的测量结果(会上传5次)
          try {
            setTimeout(() => super.write(wrapCmd(0x0c)), 1); // 响应结果
            if (Date.now() - this.lastRcv <= 10000) {
              return;
            }
          } finally {
            this.lastRcv = Date.now();
          }
        }

        if (cmd.type != 0x40) {
          // 接收到数据
          this.callListeners<Listener>(
            (l) => l.onData(this, deviceId, data, cmd, packet),
            (l) => l && (l as any).onData,
          );
        } else {
          // 10秒内的更新，仅返回一次电池电量和充电状态
          if (Date.now() - this.lastBatteryRcv > 10_000) {
            this.callListeners<Listener>(
              (l) => l.onData(this, deviceId, data, cmd, packet),
              (l) => l && (l as any).onData,
            );
          }
          this.lastBatteryRcv = Date.now();
        }
        this.responseCall(cmd, data, packet);
      } catch (err) {
        uniProxy.error(`处理V3数据时出现错误: ${deviceId}`, err, 'value: ' + binary.bytesToHex(data));
      }
    }

    protected responseCall(cmd: CmdType, data: number[], packet?: any) {
      let set = this.calls.get(cmd.type);
      if (set && set.size > 0) {
        let arr: Array<V3Call> = [];
        set.forEach((c) => {
          arr.push(c);
          c.success(data, packet);
        });
        arr.forEach((c) => set?.delete(c));
      }
    }

    /**
     * 更新休眠状态
     */
    private updateDormancy() {
      this.dormancy = false;
      clearTimeout((this as any).dormancyTimerId);
      (this as any).dormancyTimerId = setTimeout(() => (this.dormancy = true), 5_000);
    }

    /**
     * 发送指令
     *
     * @param cmd 指令
     * @returns 返回结果
     */
    override write(cmd: Uint8Array | number[], timeout: number = 2000): Promise<BpResponse> {
      return new Promise<BpResponse>((resolve, reject) => {
        let call = <V3Call>{
          cmd: cmd,
          type: getCmd(cmd[2]),
          resolve: (resp: uniapp.UniBtDeviceResponse) => {
            call.resp = utils.copyAttrs(resp, <BpResponse>{ type: call.type, cmd: cmd });
            // 非请求响应式指令直接返回结果
            if (!call.type.response) {
              clearTimeout(call.timerId);
              resolve(call.resp);
            }
          },
          reject: (err: any) => {
            clearTimeout(call.timerId);
            reject(err);
          },
          success: (data: number[], packet?: any) => {
            call.data = data;
            if (call.resp) {
              clearTimeout(call.timerId);
              call.resp.data = data;
              call.resp.packet = packet;
              resolve(call.resp);
            }
          },
        };
        let handshake = false;
        let type = call.type.type;
        let set = this.calls.get(type);
        if (!set) {
          this.calls.set(type, (set = new Set()));
        }
        try {
          set.add(call);
          // 判断是否处于休眠状态，如果处于就先发送握手指令，否则就直接发送
          if (this.dormancy) {
            handshake = true;
            this.sendHandshake()
              .then((resp) => {
                if ((resp as any).successful) {
                  // 异步发送状态
                  let callAny = call as any;
                  callAny.handshakeTimerId = setInterval(() => {
                    if (!callAny.timerId) {
                      clearInterval(callAny.handshakeTimerId);
                      return;
                    }
                    // 不是休眠状态
                    if (!this.dormancy) {
                      // 发送真正的指令
                      super
                        .write(call.cmd, timeout)
                        .then((resp) => call.resolve(resp))
                        .catch((err) => call.reject(err));
                      // 停止调用
                      clearInterval(callAny.handshakeTimerId);
                    }
                  }, 20);
                } else {
                  call.reject(new Error('无法发送指令: ' + resp.errMsg));
                }
              })
              .catch((err) => {
                uniProxy.error(err);
                call.reject(new Error('无法发送指令: ' + err.errMsg));
              });
          } else {
            super
              .write(call.cmd, timeout)
              .then((resp) => call.resolve(resp))
              .catch((err) => call.reject(err));
          }
        } finally {
          if (timeout && timeout > 0) {
            // 超时处理
            call.timerId = setTimeout(() => {
              call.timerId = undefined;
              set?.delete(call);
              this.calls.get(batteryCmd.type)?.delete((call as any).handshakeCall);
              call.reject(new Error('请求超时'));
            }, timeout + (handshake ? 1000 : 0));
          }
        }
      });
    }

    /**
     * 发送握手指令
     */
    sendHandshake(): Promise<uniapp.UniBtDeviceResponse> {
      return super.write(wrapCmd(0x01), -1); // 不调用重载的方法
    }

    /**
     * 获取主控软件版本
     */
    sendGetSoftwareVersion(): Promise<BpResponse> {
      return this.write(wrapCmd(0x02));
    }

    /**
     * 设置机器音量大小
     */
    sendSetVoice(value: number): Promise<BpResponse> {
      return this.write(wrapCmd(0x03, value & 0xff));
    }

    /**
     * 设置显示开关
     */
    sendSetDisplaySwitch(on: boolean): Promise<BpResponse> {
      return this.write(wrapCmd(0x04, on ? 0x01 : 0x00));
    }

    /**
     * 清空记录
     */
    sendClear(): Promise<BpResponse> {
      return this.write(wrapCmd(0x0a));
    }

    /**
     * 获取历史记录条数
     */
    sendGetHistory(): Promise<BpResponse> {
      return this.write(wrapCmd(0x0b));
    }

    /**
     * 停止测量
     */
    sendStopMeasure(): Promise<BpResponse> {
      return this.write(wrapCmd(0x10));
    }

    /**
     * 启动测量
     */
    sendStartMeasure(): Promise<BpResponse> {
      return this.write(wrapCmd(0x11));
    }

    /**
     * 复位系统
     */
    sendRestoration(): Promise<BpResponse> {
      return this.write(wrapCmd(0x16));
    }

    /**
     * 获取电量、 充电状态
     */
    sendGetBattery(): Promise<BpResponse> {
      return this.write(wrapCmd(0x40));
    }

    /**
     * 设置时间
     *
     * @param year 年
     * @param month 月 0~11
     * @param day 日
     * @param hour 时
     * @param minute 分
     * @returns 返回设置结果
     */
    sendSetTime(year: number, month: number, day: number, hour: number, minute: number): Promise<BpResponse> {
      return this.write(wrapCmd(0x47, year - 2000, month + 1, day, hour, minute));
    }
  }

  /**
   * 血压计监听
   */
  export interface Listener extends uniapp.OnBleClientListener<Client> {
    /**
     * 接收到数据
     *
     * @param client 客户端
     * @param deviceId 设备ID
     * @param value 数据
     * @param type 指令类型
     * @param packet 数据包，如果为 0x0C 或 0x51 类型，是 BpPacket，其他的可参考 CmdType 的解析函数返回的结果
     */
    onData(client: Client, deviceId: string, value: number[] | Array<number> | Uint8Array, type: CmdType, packet?: any): void;
  }

  /**
   * 同步调用
   */
  export interface V3Call extends uniapp.SyncCall<CmdType, BpResponse> { }

  export interface BpResponse extends uniapp.UniBtDeviceResponse {
    /**
     * 指令
     */
    cmd: number[];
    /**
     * 指令类型
     */
    type: CmdType;
    /**
     * 返回的结果
     */
    data: number[];
    /**
     * 解析的数据包
     */
    packet?: any;
  }

  /**
   * 截取有效数据载荷
   *
   * @param data 数据
   * @returns 返回数据段
   */
  export function getPayload(data: number[] | Array<number> | Uint8Array): number[] {
    return [...data.slice(3, data[1] & 0xff)];
  }

  /**
   * 拼接指令
   *
   * 包头(0x5A) + 长度(1字节) + 指令类型(1字节) + 携带的数据(0~n字节) + CRC16校验和(2字节)   // 数据为大端存储
   *
   * @param type 指令类型
   * @param payload 携带的数据
   * @returns 返回拼接的指令
   */
  export function wrapCmd(type: number, ...payload: number[]): Array<number> | number[] {
    let cmd = new Array<number>(1 + 1 + 1 + payload.length + 2);
    cmd[0] = 0x5a;
    // 数据长度(整个指令的所有字节)
    cmd[1] = cmd.length & 0xff;
    cmd[2] = type & 0xff;
    if (payload.length > 0) {
      // 拷贝数据
      binary.arraycopy(payload, 0, cmd, 3, payload.length);
    }
    // 校验和
    let crc16 = CRC16(cmd, 0, cmd.length - 2, true);
    cmd[cmd.length - 2] = crc16[0];
    cmd[cmd.length - 1] = crc16[1];
    return cmd;
  }

  /**
   * 解析血压数据
   *
   * @param data 数据
   * @param mac MAC地址(deviceId)
   * @param time 数据的时间(到秒)，默认从数据包中取
   * @returns 返回解析后的数据包
   */
  export function parse(data: number[] | Array<number> | Uint8Array, mac?: string, time?: number): V3BpPacket {
    if ((data[2] & 0xff) != 0x51 && (data[2] & 0xff) != 0x0c) {
      throw new Error('不支持的解析类型: ' + binary.bytesToHex([data[2]]));
    }
    let payload = getPayload(data);
    let date = new Date(payload[4] + 2000, payload[5] - 1, payload[6], payload[7], payload[8]);
    time = time ? time : date.getTime() / 1000;
    return <V3BpPacket>{
      mac: mac,
      time: time,
      systolic: binary.bytesToNumber([payload[0], payload[1]]), // 协议有问题(把收缩压和舒张压搞反了)
      diastolic: binary.bytesToNumber([payload[2]]), // 协议有问题(把收缩压和舒张压搞反了)
      hr: payload[3] & 0xff,
      date: utils.dateFmt(date),
      err: ERR_CODES.find((ec) => ec.code == payload[9]),
      // 预留一个字节
    };
  }

  /**
   * 血压数据包
   */
  export interface V3BpPacket {
    /**
     * 设备的MAC地址
     */
    mac: string;
    /**
     * 测量时间
     */
    time: number;
    /**
     * 数据包返回的测量时间
     */
    date: string;
    /**
     * 收缩压
     */
    systolic: number;
    /**
     * 舒张压
     */
    diastolic: number;
    /**
     * 心率
     */
    hr: number;
    /**
     * 错误信息，如果是 0x00，此对象为undefined
     */
    err: BpError;
  }

  /**
   * 指令类型
   */
  export class CmdType {
    /**
     * 类型
     * 描述
     * 是否要求返回结果
     */
    constructor(
      public readonly type: number,
      public readonly description: string,
      public readonly response: boolean,
      public readonly parser?: Function,
      public readonly data: boolean = false,
      public readonly remarks: string = '',
    ) { }
  }

  export const CMD_TYPES = <Array<CmdType>>[
    new CmdType(0x01, '握手', false),
    new CmdType(0x02, '获取主控软件版本', true, (data: number[]) => <any>{ version: data[3] & 0xff }),
    new CmdType(0x03, '设置机器音量大小', true, undefined, false, ''),
    new CmdType(0x04, '设置显示开关', true, undefined, false, '0-关, 1-开'),
    new CmdType(0x0a, '清空记录', true),
    new CmdType(0x0b, '获取历史记录条数', true, (data: number[]) => <any>{ count: binary.bytesToNumber([data[3], data[4]]) }),
    new CmdType(0x0c, '上传测量结果', false, (data: number[]) => parse(data), true),
    new CmdType(0x51, '上传没有连接蓝牙时测量的数据', false, (data: number[]) => parse(data), true),
    new CmdType(0x10, '停止测量', true),
    new CmdType(0x11, '启动测量', true),
    new CmdType(0x12, '错误信息', true, (data: number[]) => ERR_CODES.find((e) => e.code == data[3])),
    new CmdType(0x16, '复位系统', true),
    new CmdType(0x40, '获取充电状态充电电量', true, (data: number[]) => <any>{ batteryLevel: data[3] & 0xff, status: ofBatteryStatus(data[4]) }),
    new CmdType(0x3d, '实时袖带压数据', true, (data: number[]) => <any>{ pressure: binary.bytesToNumber([data[3], data[4]]), hr: data[5] & 0xff }),
    new CmdType(0x47, '设置时间', true),
  ];

  /**
   * 获取指令类型
   *
   * @param type 类型
   * @returns 返回指令类型
   */
  export const getCmd = (type: number): CmdType | undefined => CMD_TYPES.find((v) => v.type == type);
  export const batteryCmd = getCmd(0x40)!!; // 获取充电状态充电电量 & 握手响应指令

  // 错误代码：
  // 0x00 结果正常
  // 0x01 袖带过松，可能是袖带缠绕过松，或未接袖带
  // 0x02 气路漏气，可能是阀门或气路中漏气
  // 0x03 气压错误，可能是阀门无法正常打开
  // 0x04 弱信号，可能是测量对象脉搏太弱或袖带过松
  // 0x05 超范围，可能是测量对象的血压值超过了测量范围
  // 0x06 过分运动，可能是测量时，信号中含有运动伪差或太多干扰
  // 0x07 测量过压，成人模式下袖带压力超过290mmHg，儿童模式下袖带压力超过247mmHg，新生儿模式下袖带压力超过145mmHg
  // 0x08 信号饱和，由于运动或其他原因使信号幅度太大
  // 0x09 测量超时，成人/儿童模式下测量时间超过120秒，新生儿模式下测量时间超过90秒
  // 0x0A 人工停止
  // 0x0B 系统错误电量低于10%不允许测量
  // 0x0C 校准信息读取错误
  // 0x0D 无信号
  // 0X0E 不规则脉搏波，心律失常
  // 0X0F 充电停止测量
  // 0x10 超压保护，袖带压力超过设定的最大值（290）
  // 0x11 测量结果错误
  // 0x12 RTC 时钟错误
  // 0x13 存储错误
  // 0x20 通信失败，握手通信失败
  // 0x21 安全压力大于15mmHg，不可进行测量
  // 0x22 测量完成，没有在低于 15mmHg，就再次测量
  // 0x23 发送测量后，没有回应，无法启动测量
  // 0x24 无测量结果，无法获取测量结果
  // 0x25 180S 超时
  // 0x26 系统电量量过低不允许测量
  // 0x27 测量超时
  // 0x29 压力错误
  // 0x30 内存已满，不可再测量
  // 0x31 设置压力失败 49--------新加
  // 0x32 无法获取袖带压力 50-------新加
  // 0x42 夜间时间段禁止关机
  // 0x60 当前没有测量记录
  // 0x64 急停按键按下
  // 0x99 I2C 总线错误

  export class BpError {
    /**
     * @param code 错误码
     * @param errMsg 错误信息
     */
    constructor(public code: number, public errMsg: string) { }

    /**
     * 是否成功
     */
    isSuccessful(): boolean {
      return this.code == 0x00;
    }
  }

  /**
   * 错误码
   */
  export const ERR_CODES = [
    new BpError(0x00, '结果正常'),
    new BpError(0x01, '袖带过松，可能是袖带缠绕过松，或未接袖带'),
    new BpError(0x02, '气路漏气，可能是阀门或气路中漏气'),
    new BpError(0x03, '气压错误，可能是阀门无法正常打开'),
    new BpError(0x04, '弱信号，可能是测量对象脉搏太弱或袖带过松'),
    new BpError(0x05, '超范围，可能是测量对象的血压值超过了测量范围'),
    new BpError(0x06, '过分运动，可能是测量时，信号中含有运动伪差或太多干扰'),
    new BpError(0x07, '测量过压，成人模式下袖带压力超过290mmHg，儿童模式下袖带压力超过247mmHg，新生儿模式下袖带压力超过145mmHg'),
    new BpError(0x08, '信号饱和，由于运动或其他原因使信号幅度太大'),
    new BpError(0x09, '测量超时，成人/儿童模式下测量时间超过120秒，新生儿模式下测量时间超过90秒'),
    new BpError(0x0a, '人工停止'),
    new BpError(0x0b, '系统错误电量低于10%不允许测量'),
    new BpError(0x0c, '校准信息读取错误'),
    new BpError(0x0d, '无信号'),
    new BpError(0x0e, '不规则脉搏波，心律失常'),
    new BpError(0x0f, '充电停止测量'),
    new BpError(0x10, '超压保护，袖带压力超过设定的最大值（290）'),
    new BpError(0x11, '测量结果错误'),
    new BpError(0x12, 'RTC 时钟错误'),
    new BpError(0x13, '存储错误'),
    new BpError(0x20, '通信失败，握手通信失败'),
    new BpError(0x21, '安全压力大于15mmHg，不可进行测量'),
    new BpError(0x22, '测量完成，没有在低于 15mmHg，就再次测量'),
    new BpError(0x23, '发送测量后，没有回应，无法启动测量'),
    new BpError(0x24, '无测量结果，无法获取测量结果'),
    new BpError(0x25, '180S 超时'),
    new BpError(0x26, '系统电量量过低不允许测量'),
    new BpError(0x27, '测量超时'),
    new BpError(0x29, '压力错误'),
    new BpError(0x30, '内存已满，不可再测量'),
    new BpError(0x31, '设置压力失败'),
    new BpError(0x32, '无法获取袖带压力'),
    new BpError(0x42, '夜间时间段禁止关机'),
    new BpError(0x60, '当前没有测量记录'),
    new BpError(0x64, '急停按键按下'),
    new BpError(0x99, 'I2C 总线错误'),
  ];

  /**
   * 充电状态 0： 没充电 1： 正在充电 2： 充满
   */
  export enum BatteryStatus {
    uncharged = '未充电',
    charging = '正在充电',
    charge_full = '已充满',
  }
  export function ofBatteryStatus(status: number): BatteryStatus {
    switch (status) {
      case 1:
        return BatteryStatus.charging;
      case 2:
        return BatteryStatus.charge_full;
      default:
        return BatteryStatus.uncharged;
    }
  }
}
