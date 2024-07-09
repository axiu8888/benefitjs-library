import { os } from "node:os";
import { logger } from "@benefitjs/core";

/**
 * 实时算法调用
 */
export namespace RT_ecg_resp {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("RT_ecg_resp", logger.Level.debug);

  const ffi = require("ffi-napi");
  const ref = require("ref-napi");
  const Struct = require("ref-struct-napi");

  export const findLib = (libName: string) => { return `${libName}.dll` };

  // 定义 ParamsIn 结构体
  const CParamsIn = Struct({
    deviceId: ref.types.int,
    packageSn: ref.types.int,
    ecgList: ref.array(ref.types.int, 200),
    ecgFlag: ref.types.int,
    ecgFs: ref.types.int,
    chData: ref.array(ref.types.int, 25),
    abData: ref.array(ref.types.int, 25),
    rspFlag: ref.types.int,
  });

  // 定义 ParamsOut 结构体
  const CParamsOut = Struct({
    hr: ref.types.int,
    arrhythmia: ref.types.int,
    ecgfilterList: ref.array(ref.types.int, 200),
    chDatafilter: ref.array(ref.types.int, 25),
    abDatafilter: ref.array(ref.types.int, 25),
    rr: ref.types.int,
    SignalQualityflag: ref.types.int,
  });

  // 加载 DLL 并定义 processSignal 函数
  const lib = ffi.Library(`${process.cwd()}/${findLib('RT_ecg_resp')}.dll`, {
    processSignal: ["int", [CParamsIn, ref.refType(CParamsOut)]],
  });

  /**
   * 调用数据
   *
   * @param paramsIn 参数
   * @returns 返回调用结果
   */
  export function process(paramsIn: ParamsIn): ParamsOut {
    // 创建 ParamsIn 实例并赋值
    const _in = new CParamsIn();
    _in.deviceId = paramsIn.deviceId;
    _in.packageSn = paramsIn.packageSn;
    paramsIn.ecgList.forEach((v, i) => (_in.ecgList[i] = v)); // 填充 ecgList 数组
    _in.ecgFlag = paramsIn.ecgFlag;
    _in.ecgFs = paramsIn.ecgFs;
    paramsIn.chData.forEach((v, i) => (_in.chData[i] = v)); // 填充 chData 数组
    paramsIn.abData.forEach((v, i) => (_in.abData[i] = v)); // 填充 abData 数组
    _in.rspFlag = paramsIn.rspFlag;
    // 创建 ParamsOut 实例
    const _out = new CParamsOut();
    // 调用 DLL 函数
    const result = lib.processSignal(_in, _out.ref());
    return <ParamsOut>{
      hr: _out.hr,
      arrhythmia: _out.arrhythmia,
      ecgfilterList: _out.ecgfilterList,
      chDatafilter: _out.chDatafilter,
      abDatafilter: _out.abDatafilter,
      rr: _out.rr,
      SignalQualityflag: _out.SignalQualityflag,
    };
  }

  /**
   * 输入参数
   */
  export interface ParamsIn {
    /**
     * 设备ID
     */
    deviceId: number;
    /**
     * 包序号
     */
    packageSn: number;
    /**
     * 心电数组: 200
     */
    ecgList: number[];
    /**
     * 心电导联脱落状态: 1为脱落
     */
    ecgFlag: number;
    /**
     * 心电采样率: 200
     */
    ecgFs: number;
    /**
     * 胸呼吸 25
     */
    chData: number[];
    /**
     * 腹呼吸 25
     */
    abData: number[];
    /**
     * 胸呼吸的导联脱落状态, 1是否为脱落
     */
    rspFlag: number;
  }

  /**
   * 输出
   */
  export interface ParamsOut {
    /**
     * 心率
     */
    hr: number;
    /**
     * 心律异常
     */
    arrhythmia: number;
    /**
     * 过滤后的心电波
     */
    ecgfilterList: number[];
    /**
     * 过滤后的胸呼吸波
     */
    chDatafilter: number[];
    /**
     * 过滤后的心腹呼吸波
     */
    abDatafilter: number[];
    /**
     * 呼吸率
     */
    rr: number;
    /**
     * 信号质量标志
     */
    SignalQualityflag: number;
  }
}
