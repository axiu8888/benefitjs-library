import { ByteBuf, binary, utils } from '@benefitjs/core';
import { GattUUID, IDevice } from './bluetooth';

/**
 * U9 血压设备
 */
export namespace u9 {
  /**
   * UUID
   */
  export const uuid = <GattUUID>{
    service: '0000fff0-0000-1000-8000-00805f9b34fb',
    readCharacteristic: '0000fff1-0000-1000-8000-00805f9b34fb',
    writeCharacteristic: '0000fff2-0000-1000-8000-00805f9b34fb',
    notifyCharacteristic: '0000fff1-0000-1000-8000-00805f9b34fb',
  };

  /**
   * 接收数据的反馈，避免重复返回数据
   */
  export const RCV_FEEDBACK = [0xfd, 0xfd, 0xfa, 0x60, 0x0d, 0x0a];

  /**
   * U9 蓝牙血压计
   */
  export class Device implements IDevice {
    buf = new ByteBuf();
    uuid = uuid;

    private lastRcv = Date.now();

    addBuf(value?: number[] | undefined): number[] | undefined {
      throw new Error('不支持');
    }

    resolve(value: number[]): any {
      let type = value[2];
      let cmd = CMD_TYPES.find((c) => c.type == type);
      let result = { cmd: cmd } as any;
      switch (type) {
        case 0x06: // 开始测量
          break;
        case 0xfb: // 压力值
          // 血压计量测过程中发的压力信号
          // [0xFD,0xFD,0xFB,PressureH, PressureL,0X0D, 0x0A]
          result.pressure = binary.bytesToNumber([value[3], value[4]]);
          break;
        case 0xfd:
          result.err = ERROR_TYPES.find((e) => e.type == value[0]);
          break;
        case 0xfc: // 无需处理
          break;
        case 0xfe: // 测量结果
          //write(); // 响应，避免重复返回数据
          // [0xFD,0xFD,0xFE, SYS,DIA,PUL, PAD, YEARH, YEARL, MONTH, DAY, HOUR, MINUTE, 0X0D, 0x0A]
          // 注: SYS为收缩压,DIA为舒张压,PUL为心率. 这个数据血压会连续传5次.
          try {
            if (Date.now() - this.lastRcv <= 10_000) {
              return;
            }
            let date = new Date(binary.bytesToNumber([value[8], value[9]]), value[10] - 1, value[11], value[12], value[13]);
            // 解析数据
            result.packet = <BpPacket>{
              time: date.getTime(),
              date: utils.dateFmt(date),
              systolic: value[4] & 0xff, // 收缩压
              diastolic: value[5] & 0xff, // 舒张压
              hr: value[6] & 0xff, // 心跳
            };
          } finally {
            this.lastRcv = Date.now();
          }
          break;
        case 0xff: // 测量完成
          break;
      }
      return result;
    }
  }

  /**
   * 发送测量指令，测量指令发送后，会收到[0xFD,0xFD,0x05, 0x0D, 0x0A],并开始测量
   *
   * @param date 时间
   * @return 是否发送，如果未处于连接状态，发送失败
   */
  export const startMeasure = (date = new Date()): number[] => {
    return wrapCmd(0x05, date);
  };

  /**
   * 血压数据包
   */
  export interface BpPacket {
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
  }

  /**
   * 发送时间指令，==> 0xFD,0xFD,0xFA,0x05,YEAR,MONTH,DAY,HOUR,MINUTE,SECOND,0X0D, 0x0A
   * 返回指令，==> 0xFD,0xFD,0x05, 0x0D, 0x0A
   *
   * @param flag 标志
   * @param date 日期
   */
  export function wrapCmd(flag: number, date = new Date()) {
    // 0xFD,0xFD,0xFA,0x05,YEAR,MONTH,DAY,HOUR,MINUTE,SECOND,0X0D, 0x0A
    let cmd = new Array<number>(12);
    cmd[0] = 0xfd;
    cmd[1] = 0xfd;
    cmd[2] = 0xfa;
    cmd[3] = flag;
    cmd[4] = date.getFullYear() % 2000 & 0xff; // year
    cmd[5] = (date.getMonth() + 1) & 0xff; // month
    cmd[6] = date.getDay() & 0xff; // day
    cmd[7] = date.getHours() & 0xff; // hour
    cmd[8] = date.getMinutes() & 0xff; // minute
    cmd[9] = date.getSeconds() & 0xff; // second
    cmd[10] = 0x0d;
    cmd[11] = 0x0a;
    return cmd;
  }

  /**
   * 指令类型
   */
  export interface CmdType {
    readonly type: number;
    readonly name: string;
    readonly description: string;
    readonly parser?: Function;
  }
  /**
   * 指令类型
   */
  export const CMD_TYPES = <CmdType[]>[
    <CmdType>{ type: 0x06, name: 'start_measure', description: '开始测量' },
    <CmdType>{ type: 0xfb, name: 'pressure', description: '实时压力' },
    <CmdType>{ type: 0xfc, name: 'other1', description: '其他' },
    <CmdType>{ type: 0xfe, name: 'measure_success', description: '测量成功' },
    <CmdType>{ type: 0xfd, name: 'measure_failure', description: '测量失败' },
    <CmdType>{ type: 0xff, name: 'measure_complete', description: '测量完成' },
    <CmdType>{ type: 0x00, name: 'unknown', description: '未知' },
  ];

  /**
   * 血压异常
   */
  export interface BpError {
    /**
     * 类型
     */
    readonly type: number;
    /**
     * 描述
     */
    readonly description: string;
  }
  /**
   * 血压异常
   */
  export const ERROR_TYPES = <Array<BpError>>[
    <BpError>{ type: 0x0e, description: '血压计异常' },
    <BpError>{ type: 0x01, description: '人体心跳信号太小或压力突降' },
    <BpError>{ type: 0x02, description: '杂讯干扰' },
    <BpError>{ type: 0x03, description: '充气时间过长' },
    <BpError>{ type: 0x04, description: '测得的结果异常' },
    <BpError>{ type: 0x0c, description: '校正异常' },
  ];

  /**
   * 测量出错时，血压计发送
   * [0xFD,0xFD,0xFD,0x0E, 0X0D, 0x0A]		;E-E	 EEPROM异常  血压计异常,联系你的经销商
   * [0xFD,0xFD,0xFD,0x01, 0X0D, 0x0A]		;E-prepare_1	 人体心跳信号太小或压力突降
   * [0xFD,0xFD,0xFD,0x02, 0X0D, 0x0A]		;E-prepare_2	 杂讯干扰
   * [0xFD,0xFD,0xFD,0x03, 0X0D, 0x0A]		;E-3 充气时间过长
   * [0xFD,0xFD,0xFD,0x04, 0X0D, 0x0A]		;E-4 测得的结果异常
   * [0xFD,0xFD,0xFD,0x0C, 0X0D, 0x0A]		;E-C 校正异常
   *   量测错误,请根据说明书,重新戴好CUFF,保持安静,重新量测. (以上5项都用这句话).
   *
   * [0xFD,0xFD,0xFD,0x0B, 0X0D, 0x0A]		;E-B 电源低电压  电池电量低,请更换电池.
   * 注: SYS为收缩压,DIA为舒张压,PUL为心率. 这个数据血压会连续传5次.  E-prepare_1,E-prepare_2,E-3,E-4,E-E,E-B为错误代码.
   */

  /**
   * 当上位机对码并连接成功后,发[0xFD,0xFD,0xFA,0x05,YEAR,MONTH,DAY,HOUR,MINUTE,SECOND,0X0D, 0x0A]
   * 年份只用发后两位，比如2019年，就发0x13
   * 告之血压计,连接成功,并可以进行量测.
   * 同时血压计回复: [0xFD,0xFD,0x05, 0x0D, 0x0A],并开始量测.
   * 注:如果上位机没有收到血压计回复,再循环发指令5次.否则请关血压计,并重新启动连接.
   * 注:如果血压计在20S内没有收到连接信号,则会自动进入无BT血压计测试.
   *
   *
   * 血压计量测过程中会发压力信号:	[0xFD,0xFD,0xFB,PressureH, PressureL,0X0D, 0x0A]
   * 注:Pressure信号为2bytes,所以压力为PressureH*256+PressureL,每0.5S发送一次.
   *
   *
   * 测量完成后,血压计发送以下测试结果:
   * [0xFD,0xFD,0xFE, SYS,DIA,PUL, PAD,YEARH,YEARL,MONTH,DAY,HOUR,MINUTE,0X0D, 0x0A]	;测试结果
   * APP回复[0xFD,0xFD,0XFA,0X60,0X0D,0X0A] 表示收到数据。
   * 血压计收到此回复后会把之前未上传成功的数据也传出来。数据发送完后会发送
   * [0xfd,0xfd,0xff,0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,0x0d,0x0a]表示已完成。
   * 如果APP想手动让血压计上传之前未上传的数据，可以发[0xFD,0XFD,0XFA,0X07,YEAR,MONTH,DAY,HOUR,MINUTE,SECOND,0X0D,0X0A]
   *
   *
   * 测量出错时，血压计发送
   * [0xFD,0xFD,0xFD,0x0E, 0X0D, 0x0A]		;E-E	 EEPROM异常  血压计异常,联系你的经销商
   * [0xFD,0xFD,0xFD,0x01, 0X0D, 0x0A]		;E-prepare_1	 人体心跳信号太小或压力突降
   * [0xFD,0xFD,0xFD,0x02, 0X0D, 0x0A]		;E-prepare_2	 杂讯干扰
   * [0xFD,0xFD,0xFD,0x03, 0X0D, 0x0A]		;E-3 充气时间过长
   * [0xFD,0xFD,0xFD,0x04, 0X0D, 0x0A]		;E-4 测得的结果异常
   * [0xFD,0xFD,0xFD,0x0C, 0X0D, 0x0A]		;E-C 校正异常
   *                                        量测错误,请根据说明书,重新戴好CUFF,保
   * 持安静,重新量测. (以上5项都用这句话).
   * [0xFD,0xFD,0xFD,0x0B, 0X0D, 0x0A]		;E-B 电源低电压  电池电量低,请更换电池.
   * 注: SYS为收缩压,DIA为舒张压,PUL为心率. 这个数据血压会连续传5次.
   * E-prepare_1,E-prepare_2,E-3,E-4,E-E,E-B为错误代码.
   *
   * 几点说明：
   * prepare_1，SYS,DIA,PUL,PAD：SYS=高压,DIA=低压,PUL=心跳,PAD=心律不齐 ；
   * prepare_2，app发给血压计加秒 ；
   * 3，血压计发给app的没有秒；
   * 4，目前历史记录是保存的，血压计软件里面对已经上传记录做标记｛APP回复[0xFD,0xFD,0XFA,0X60,0X0D,0X0A] 表示收到数据，血压计收到了这个命令，软件就给这条及记录做个标记已经上传｝。
   *
   */
}
