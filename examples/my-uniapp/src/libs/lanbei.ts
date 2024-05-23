import { utils, binary, uniapp, bluetooth } from "@benefitjs/uni-plugins";
import { log } from "./log";

/**
 * 兰贝
 */
export namespace lanbei {
  // uni代理
  const uniProxy = uniapp.uniProxy;

  const _device1 = <uniapp.BluetoothDevice>{
    deviceId: 'B0:10:A0:94:1D:4B',
    name: 'ECG-51000001',
    RSSI: -68,
    localName: 'ECG-51000001',
    advertisServiceUUIDs: [],
  };

  const _device6 = <uniapp.BluetoothDevice>{
    deviceId: 'B0:10:A0:94:1D:60',
    name: 'ECG-56000001',
    RSSI: -55,
    localName: 'ECG-56000001',
    advertisServiceUUIDs: [],
  };

  /**
   * 兰贝单导联和6导联蓝牙客户端
   */
  export class Client extends bluetooth.BluetoothClient<Client> {
    /**
     * 设备的序号(设备ID)
     */
    deviceSn?: string;
    /**
     * 解析中的数据
     */
    private packeting?: Packet;

    private readonly calls = new Map<CmdType, Set<LanBeiCall>>();

    private readonly handler = <uniapp.OnBleClientListener<Client>>{
      onServiceDiscover(client, deviceId, services) {
        let init = () => {
          client
            .write([0xe8, 0xe0])
            .then((resp) => setTimeout(() => client.enableNotification(), 100))
            .catch((err) => {
              if ((err as any).code > 0) {
                setTimeout(() => init(), 50);
              }
            });
        };
        // 发送指令
        setTimeout(() => init(), 50);
      },

      onCharacteristicWrite(client, deviceId, value) {
        log.debug(`发送指令: ${deviceId}, value: ${binary.bytesToHex(value)}`);
      },

      onCharacteristicChanged(client, deviceId, value, resp) {
        log.debug(`【${deviceId}】接收到数据: ${binary.bytesToHex(value)}`);
        try {
          if (value.length <= 50) {
            let cmd = findCmdType(value[1]);
            if (!cmd || cmd == cmd_ack) {
              return;
            }
            // 解析
            let packet: any;
            switch (cmd.type) {
              case cmd_getStatus.type:
                packet = {
                  remainingDiskSize: binary.bytesToNumber(value.slice(2, 2 + 2), false), // 剩余磁盘容量
                  status: (value[4] & 0xff) >= 0x30, // 是否采集中
                  batteryLevel: value[5] & 0xff, // 电池电量
                };
                break;
              case cmd_getVersion.type:
                packet = { version: binary.bytesToStr(value.slice(2)) };
                break;
              case cmd_getTime.type:
                packet = { time: binary.bytesToNumber(value.slice(2, 2 + 4), false) };
                packet.date = utils.dateFmt(packet.time * 1000);
                break;
              case cmd_startCollector.type:
              case cmd_stopCollector.type:
              case cmd_setTime.type:
              case cmd_setUser.type:
              case cmd_setSN.type:
              case cmd_clear.type:
                packet = { status: (value[5] & 0xff) == 0x01 };
                break;
            }

            client.callListeners<Listener>(
              (l) => l.onCmdData(client, deviceId, cmd, packet, value as any),
              (l) => l && (l as any).onCmdData,
            );

            let set = client.calls.get(cmd);
            if (set && set.size > 0) {
              let remove = <Array<LanBeiCall>>[];
              set.forEach((c) => {
                try {
                  remove.push(c);
                  c.success(value, packet);
                } catch (err) {
                  log.warn(err);
                }
              });
              remove.forEach((c) => set?.delete(c));
            }
          } else {
            // 反馈
            client.ack(binary.bytesToNumber(value.slice(12, 16)));
            // 数据
            client.buf.write(value);
            // 解析数据
            client.resolvePacket(deviceId);
          }
        } catch (err) {
          log.warn('兰贝设备', err);
        }
      },
    };

    constructor(public readonly leadType: LeadType) {
      super(<uniapp.GattUUID>{
        service: '0000fff0-0000-1000-8000-00805f9b34fb',
        readCharacteristic: '0000fff2-0000-1000-8000-00805f9b34fb',
        writeCharacteristic: '0000fff1-0000-1000-8000-00805f9b34fb',
        notifyCharacteristic: '0000fff2-0000-1000-8000-00805f9b34fb',
        mtu: 512,
      });
      super.addListener(this.handler);
      cmd_types.forEach((c) => this.calls.set(c, new Set()));
    }

    protected resolvePacket(deviceId: string) {
      let lead = this.leadType;
      while (this.buf.size() >= lead.perSize) {
        // 读取第一个包
        let data = this.buf.read(0, lead.perSize, true);
        // 解析
        let packeting = this.packeting;
        if (!packeting) {
          this.packeting = packeting = packetFactory(this);
        }
        let lp = lead.parse(data);
        packeting.deviceId = lp.deviceSn;
        packeting.time = lp.time;
        packeting.date = utils.dateFmt(lp.time * 1000);
        try {
          while (lp.segments.length > 0) {
            // 采集好一个完整包
            let sp = lp.segments.shift()!!;
            packeting.rawI.push(...sp.I); // 心电 I
            packeting.x.push(sp.x);
            packeting.y.push(sp.y);
            packeting.z.push(sp.z);
            if (lead == lead1) {
              packeting.resp.push(sp.resp); // 呼吸
            } else if (lead == lead6) {
              packeting.rawII.push(...sp.II); // 心电 II
            }
            if (packeting.x.length >= 25) {
              let ep = packeting;
              ep.I = toECGWave_10bits(ep.rawI.slice(), lead.ad);
              switch (lead.type) {
                case lead1.type:
                  break;
                case lead6.type:
                  ep.II = toECGWave_10bits(ep.rawII.slice(), lead.ad);
                  ep.III = calculateLeadWave(ep.I, ep.II, Lead.III);
                  ep.aVR = calculateLeadWave(ep.I, ep.II, Lead.aVR);
                  ep.aVL = calculateLeadWave(ep.I, ep.II, Lead.aVL);
                  ep.aVF = calculateLeadWave(ep.I, ep.II, Lead.aVF);
                  break;
              }
              this.callListeners<Listener>(
                (l) => l.onData(this, deviceId, lead, ep),
                (l) => l && (l as any).onData,
              );
              // 创建新的数据包
              this.packeting = packeting = packetFactory(this);
            }
          }
        } catch (err) {
          log.debug('解析出錯', binary.bytesToHex(data));
        }
      }
    }

    /**
     * 确认
     */
    protected ack(sn: number) {
      let snBytes = binary.numberToBytes(sn, 32, false);
      return super.write([0xe8, 0x24, snBytes[0], snBytes[1], snBytes[2], snBytes[3]]);
    }

    override write(cmd: Uint8Array | number[], timeout: number = uniProxy.timeout): Promise<LanBeiResponse> {
      return new Promise<LanBeiResponse>((resolve, reject) => {
        let type = findCmdType(cmd[1]);
        if (type && type != cmd_ack) {
          let call = <LanBeiCall>{
            cmd: cmd,
            type: type,
            resp: <LanBeiResponse>{ type: type, cmd: cmd },
            resolve: (resp: uniapp.UniBtDeviceResponse) => {
              utils.copyAttrs(resp, call.resp);
            },
            reject: (err: any) => {
              try {
                clearTimeout(call.timerId);
                reject(err);
              } finally {
                this.calls.get(call.type)?.delete(call);
              }
            },
            success: (data: number[], packet?: any) => {
              try {
                clearTimeout(call.timerId);
                call.data = data;
                call.resp.data = data;
                call.resp.packet = packet;
                resolve(call.resp);
              } finally {
                this.calls.get(call.type)?.delete(call);
              }
            },
          };
          try {
            this.calls.get(type)?.add(call);
            super
              .write(cmd, timeout)
              .then((resp) => call.resolve(resp))
              .catch((err) => call.reject(err));
          } finally {
            setTimeout(() => {
              if (type) {
                this.calls.get(type)?.delete(call);
              }
            }, Math.max(timeout ? timeout + 2 : 0, 2000));
          }
        } else {
          super
            .write(cmd, timeout)
            .then((resp) => resolve(utils.copyAttrs(resp, <LanBeiResponse>{ type: type, cmd: cmd })))
            .catch(reject);
        }
      });
    }

    /**
     * 查询状态
     */
    getStatus(): Promise<LanBeiResponse> {
      return this.write(wrapCmd(cmd_getStatus));
    }

    /**
     * 查询版本
     */
    getVersion(): Promise<LanBeiResponse> {
      return this.write(wrapCmd(cmd_getVersion));
    }

    /**
     * 开始采集
     *
     * @param duration 采集时长(分钟)，0表示一直采集
     * @returns 返回 LanBeiResponse
     */
    startCollector(duration: number = 0): Promise<LanBeiResponse> {
      return this.write(wrapCmd(cmd_startCollector, ...binary.numberToBytes(Math.max(duration, 0), 16, false)));
    }

    /**
     * 停止采集
     */
    stopCollector(): Promise<LanBeiResponse> {
      return this.write(wrapCmd(cmd_stopCollector));
    }

    /**
     * 查询时间
     */
    getTime(): Promise<LanBeiResponse> {
      return this.write(wrapCmd(cmd_getTime));
    }

    /**
     * 设置时间
     *
     * @param time 时间
     * @returns 返回 LanBeiResponse
     */
    setTime(time: Date = new Date()): Promise<LanBeiResponse> {
      // 32位，小端字节序
      return this.write(wrapCmd(cmd_setTime, ...binary.numberToBytes(time.getTime() / 1000, 32, false)));
    }

    /**
     * 设置时间
     *
     * @param user 用户名(18个ASCII码字符)
     * @returns 返回 LanBeiResponse
     */
    setUser(user: string): Promise<LanBeiResponse> {
      if (!user || (user.length > 18 && !utils.isAscii(user))) {
        throw new Error('仅允许18个ASCII字符');
      }
      return this.write(wrapCmd(cmd_setUser, ...binary.toCharArray(user)));
    }

    /**
     * 设置设备编号(仅数字或字母)
     *
     * @param sn 序列号
     */
    setDeviceSN(sn: string): Promise<LanBeiResponse> {
      if (!sn || (sn.length > 8 && !utils.isAscii(sn))) {
        throw new Error('仅允许8个ASCII字符');
      }
      return this.write(wrapCmd(cmd_setSN, ...binary.toCharArray(sn)));
    }

    /**
     * 清空数据
     */
    clear(): Promise<LanBeiResponse> {
      return this.write(wrapCmd(cmd_clear));
    }
  }

  export const packetFactory = (client: Client) => {
    let lead = client.leadType;
    return <Packet>{
      deviceId: client.deviceSn,
      mac: client.device?.deviceId,
      time: Date.now(),
      rawI: <Array<number>>[], // 单导/6导
      I: <Array<number>>[], // 单导/6导
      resp: lead == lead1 ? <Array<number>>[] : undefined, // 单导
      rawII: lead == lead6 ? <Array<number>>[] : undefined, // 6导 ↓
      II: lead == lead6 ? <Array<number>>[] : undefined,
      III: lead == lead6 ? <Array<number>>[] : undefined,
      aVR: lead == lead6 ? <Array<number>>[] : undefined,
      aVL: lead == lead6 ? <Array<number>>[] : undefined,
      aVF: lead == lead6 ? <Array<number>>[] : undefined, // 6导 ↑
      x: <Array<number>>[],
      y: <Array<number>>[],
      z: <Array<number>>[],
    };
  };

  /**
   * 兰贝设备监听
   */
  export interface Listener extends uniapp.OnBleClientListener<Client> {
    /**
     * 接收数据
     *
     * @param client 客户端
     * @param deviceId 设备ID
     * @param cmd 指令类型
     * @param packet 数据包
     * @param data 字节数据
     */
    onCmdData(client: Client, deviceId: string, cmd: CmdType | undefined, packet: any, data: number[]): void;

    /**
     * 接收数据
     *
     * @param client 客户端
     * @param deviceId 设备ID
     * @param lead 导联类型
     * @param packet 数据包
     */
    onData(client: Client, deviceId: string, lead: LeadType, packet: Packet): void;
  }

  /**
   * 兰贝数据包
   */
  export interface Packet {
    /**
     * 设备ID
     */
    deviceId: string;
    /**
     * MAC地址
     */
    mac: string;
    /**
     * 导联
     */
    leadType: LeadType;
    /**
     * 时间
     */
    time: number;
    /**
     * 采集日期
     */
    date: string;
    /**
     * 包序号
     */
    packetSn: number;
    /**
     * 呼吸 单导
     */
    resp: number[];

    /**
     * 原始数据：I  单导或6导
     */
    rawI: number[];
    /**
     * 原始数据：II 6导
     */
    rawII: number[];

    /**
     * I 单导或6导
     */
    I: number[];
    /**
     * II 6导
     */
    II: number[];
    // 其它导联 6导
    III: number[];
    aVR: number[];
    aVL: number[];
    aVF: number[];

    x: number[];
    y: number[];
    z: number[];
  }

  /**
   * 导联
   */
  export enum Lead {
    I = 'I',
    II = 'II',
    III = 'III',
    aVR = 'aVR',
    aVL = 'aVL',
    aVF = 'aVF',
  }

  /**
   * 同步调用
   */
  export interface LanBeiCall extends uniapp.SyncCall<CmdType, LanBeiResponse> { }

  /**
   * 响应
   */
  export interface LanBeiResponse extends uniapp.UniBtDeviceResponse {
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
   * 包装指令
   *
   * @param type 类型
   * @param opts 其他参数
   * @returns 返回指令
   */
  export function wrapCmd(type: CmdType, ...opts: number[]): number[] {
    let cmd = [2 + opts.length];
    cmd[0] = 0xe8;
    cmd[1] = type.type;
    if (opts.length > 0) {
      binary.arraycopy(opts, 0, cmd, 2, opts.length);
    }
    return cmd;
  }

  /**
   * 确认数据，心电贴收到确认数据指令会自动上传下一包数据
   * <p>
   * 指令：0xE8 0x24 C1 C2 C3 C4
   * C1 C2 C3 C4为数据包序号
   * 4字节小端格式
   * <p>
   * 响应：244字节数据包
   */
  export function ack(client: Client, packetSn: number): Promise<uniapp.UniBtDeviceResponse> {
    let data = binary.numberToBytes(packetSn, 32, false);
    return client.write([0xe8, 0x24, data[0], data[1], data[2], data[3]]);
  }

  /**
   * 指令类型
   */
  export interface CmdType {
    /**
     * 类型
     */
    readonly type: number;
    /**
     * 描述
     */
    readonly description: string;
  }

  export const cmd_getStatus = <CmdType>{ type: 0x10, description: '查询状态' };
  export const cmd_getVersion = <CmdType>{ type: 0x13, description: '查询版本' };
  export const cmd_getTime = <CmdType>{ type: 0x1f, description: '查询时间' };
  export const cmd_startCollector = <CmdType>{ type: 0x22, description: '开始采集' };
  export const cmd_stopCollector = <CmdType>{ type: 0x23, description: '停止采集' };
  export const cmd_setTime = <CmdType>{ type: 0x40, description: '同步时间' };
  export const cmd_setUser = <CmdType>{ type: 0x41, description: '设置测试用户' };
  export const cmd_setSN = <CmdType>{ type: 0xa1, description: '设置设备编号' };
  export const cmd_clear = <CmdType>{ type: 0xd3, description: '清空存储数据' };
  export const cmd_ack = <CmdType>{ type: 0x24, description: '包序号确认' };
  export const cmd_types = [
    cmd_getStatus,
    cmd_getVersion,
    cmd_getTime,
    cmd_startCollector,
    cmd_stopCollector,
    cmd_setTime,
    cmd_setUser,
    cmd_setSN,
    cmd_clear,
    cmd_ack
  ];
  /**
   * 查找指令类型
   */
  export const findCmdType = (type: number) => cmd_types.find((c) => c.type == type);

  /**
   * 设备类型
   */
  export interface LeadType {
    /**
     * AD值
     */
    ad: number;
    /**
     * 类型
     */
    type: number;
    /**
     * 名称
     */
    name: string;
    /**
     * 每个包的长度
     */
    perSize: number;
    /**
     * 每个包的片段数
     */
    segmentSize: number;
    /**
     * 需要缓存的数据长度
     */
    bufSize: number;
    /**
     * 采样率: 25
     */
    sample: number;
    /**
     * 解析
     *
     * @param client 设备的客户端
     * @param data 数据
     * @returns 返回解析的数据包
     */
    parse(data: number[]): LeadPacket;
    /**
     * 解析数据片段
     *
     * @param segment 数据片段
     */
    parseSegment(segment: number[]): SegmentPacket;
  }

  export interface LeadPacket {
    /**
     * 设备编号
     */
    deviceSn: string;
    /**
     * 时间
     */
    time: number;
    /**
     * 包序号
     */
    packetSn: number;
    /**
     * 片段
     */
    segments: SegmentPacket[];
  }

  /**
   * 单个片段
   */
  export interface SegmentPacket {
    /**
     * 单导心电 / 6导心电I
     */
    I: number[];
    /**
     * 6导心电II
     */
    II: number[];
    /**
     * 呼吸
     */
    resp: number;
    /**
     * X 轴
     */
    x: number;
    /**
     * Y 轴
     */
    y: number;
    /**
     * Z 轴
     */
    z: number;
  }

  // 采样率: 三轴和呼吸 25

  /**
   * 单导联
   *
   * 每个包232字节，设备号(8 byte) + 时间(4 byte) + 包序号(4 byte) + 9 * 24(共216个字节的数据片段)
   *
   * 数据片段(24): ecg(8个点 * 2(byte)) + resp(1个点 * 2(byte))  + xyz(三轴三个点 * 2(byte))  格式: e e e e e e e e r xyz
   *
   * 采样率: 25
   *
   * 25 / 9 = 2.777... 所以需要缓存至少3个包
   */
  export const lead1 = <LeadType>{
    ad: 300, // 970/734
    type: 1,
    name: '单导',
    perSize: 232,
    segmentSize: 9,
    bufSize: 232 * 3,
    sample: 25,
    parse(data: number[]) {
      let lp = <LeadPacket>{
        deviceSn: binary.bytesToStr(data.slice(0, 8)),
        time: binary.bytesToNumber(data.slice(8, 12), false),
        packetSn: binary.bytesToNumber(data.slice(12, 16), false),
        segments: <Array<SegmentPacket>>[],
      };
      for (let i = 0, start, segment; i < 9; i++) {
        start = 16 + i * 24;
        segment = data.slice(start, start + 24);
        lp.segments.push(this.parseSegment(segment));
      }
      return lp;
    },
    parseSegment(segment) {
      return <SegmentPacket>{
        I: binary.bytesToNumberArray(segment.slice(0, 16), 16, false, true),
        resp: binary.bytesToNumber(segment.slice(16, 18), false, true),
        x: binary.bytesToNumber(segment.slice(18, 20), false, true),
        y: binary.bytesToNumber(segment.slice(20, 22), false, true),
        z: binary.bytesToNumber(segment.slice(22, 24), false, true),
      };
    },
  };

  /**
   * 6导联
   *
   * 每个包244字节，设备号(8 byte) + 时间(4 byte) + 包序号(4 byte) + 6 * 38(共228个字节的数据片段)
   *
   * 数据片段(38): ecg(8个点 * 4(byte)) + xyz(三轴三个点 * 2(byte)) 格式: AB AB AB AB AB AB AB AB xyz，其中AB分别代表一个导联的数据
   *
   * 采样率: 25
   *
   * 25 / 6 = 4.16... 所以需要缓存至少5个包
   */
  export const lead6 = <LeadType>{
    ad: 734, // 970/734
    type: 6,
    name: '6导',
    perSize: 244,
    segmentSize: 6,
    bufSize: 244 * 5,
    sample: 25,
    parse(data) {
      let lp = <LeadPacket>{
        deviceSn: binary.bytesToStr(data.slice(0, 8)),
        time: binary.bytesToNumber(data.slice(8, 12), false, true),
        packetSn: binary.bytesToNumber(data.slice(12, 16), false, true),
        segments: <Array<SegmentPacket>>[],
      };
      for (let i = 0, start, segment; i < 6; i++) {
        start = 16 + i * 38;
        segment = data.slice(start, start + 38);
        lp.segments.push(this.parseSegment(segment));
      }
      return lp;
    },
    parseSegment(segment) {
      return <SegmentPacket>{
        I: parseWave(segment.slice(0, 32), 2, 8, 2, 32),
        II: parseWave(segment.slice(0, 32), 0, 8, 2, 32),
        x: binary.bytesToNumber(segment.slice(32, 34), false, true),
        y: binary.bytesToNumber(segment.slice(34, 36), false, true),
        z: binary.bytesToNumber(segment.slice(36, 38), false, true),
      };
    },
  };

  /**
   * 解析波形
   *
   * @param data    数据
   * @param pos     每组位置
   * @param size    每组的数量
   * @param perOffset 每个点的偏移量
   * @param step    每组的步长，比如：28个字节一个循环
   * @return 返回解析后的数据
   */
  function parseWave(data: number[], pos: number, size: number, perOffset: number, step: number) {
    return binary.parseWave(data, 0, data.length, pos, size, perOffset, step, false, true);
  }

  /**
   * 逻辑计算导联数据
   *
   * @param I  I导数据
   * @param II   II导数据
   * @param lead 导联
   * @return 返回计算的值
   */
  const calculateLeadWave = (I: number[], II: number[], lead: Lead) => {
    let wave = new Array<number>(I.length);
    for (let i = 0; i < wave.length; i++) {
      switch (lead) {
        case Lead.I:
          wave[i] = I[i];
          break;
        case Lead.II:
          wave[i] = II[i];
          break;
        case Lead.III:
          wave[i] = Math.round(II[i] - I[i]) + 512;
          break;
        case Lead.aVR:
          wave[i] = Math.round(-0.5 * (I[i] + II[i])) + 1024;
          break;
        case Lead.aVL:
          wave[i] = Math.round(I[i] - 0.5 * II[i]) + 256;
          break;
        case Lead.aVF:
          wave[i] = Math.round(II[i] - 0.5 * I[i]) + 256;
          break;
      }
    }
    return wave;
  };

  /**
   * 转成10位的心电波形
   *
   * @param wave 心电波形
   * @return 返回心电波形
   */
  const toECGWave_10bits = (wave: number[], ad: number) => {
    for (let i = 0; i < wave.length; i++) {
      wave[i] = toECG_10bits(wave[i], ad);
    }
    return wave;
  };

  /**
   * 转成10位
   */
  const toECG_10bits = (value: number, ad: number) => Math.round((value * 80) / ad) + 512;
}
