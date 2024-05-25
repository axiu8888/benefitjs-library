import { utils, logger, processEnv } from "@benefitjs/core";

/**
 * 日志打印
 */
export const log = logger.newProxy("desktop-app", logger.Level.debug);
// 允许打印的日志等级
logger.global.level = logger.Level.debug;
// 自定义消息格式
logger.global.convert = (level: string, tag: string, ...msg: any): any => {
  const time = utils.dateFmt(Date.now(), 'yyyy-MM-dd HH:mm:ss.SSS');
  return [`${time} [${processEnv.getType()}] ${level} [${tag}] ==>:`, ...msg];
};
// // 自定义打印，输出到控制台，或者写入文件中
// logger.global.printer = (
//   current: logger.Level,
//   level: logger.Level,
//   tag: string,
//   ...msg: any
// ) => {
//   logger.print(current, level, tag, ...msg);
// };
