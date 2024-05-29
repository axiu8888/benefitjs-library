/**
 * 环境工具
 */
export namespace processEnv {
  /**
   * 浏览器类型
   */
  export enum Browser {
    Chrome = 'Chrome',
    Firefox = 'Firefox',
    Safari = 'Safari',
    Edge = 'Edge',
    Opera = 'Opera',
    Unknown = 'Unknown',
  }

  /**
   * 环境类型
   */
  export enum Type {
    Browser = 'browser', // 浏览器
    Electron = 'electron', // Electron
    Node = 'node', // NodeJS
    Uni = 'uni', // UNI
    WeiXin = 'weixin', // 微信小程序
    Unknown = 'unknown', // 未知
  }

  /**
   * 获取环境类型
   */
  export const getType = () => {
    if (isUni()) return Type.Uni;
    if (isWeiXin()) return Type.WeiXin;
    if (isNode()) return isElectron() ? Type.Electron : Type.Node;
    if (isBrowser()) return Type.Browser;
    return Type.Unknown;
  };

  /**
   * 是否为Node环境
   */
  //@ts-ignore
  export const isNode = () => typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
  /**
   * 是否为浏览器环境
   */
  //@ts-ignore
  export const isBrowser = () => typeof window !== 'undefined' && typeof window.document !== 'undefined';
  /**
   * 是否为Electron环境
   */
  //@ts-ignore
  export const isElectron = () => typeof process !== 'undefined' && process.versions != null && process.versions.electron != null;
  /**
   * 判断是否为微信小程序
   */
  //@ts-ignore
  export const isWeiXin = () => typeof wx !== 'undefined' && typeof wx.getSystemInfo === 'function';
  /**
   * 判断是否为UNI app
   */
  //@ts-ignore
  export const isUni = () => typeof uni !== 'undefined' && typeof uni.getSystemInfo === 'function';

  /**
   * 获取浏览器的类型
   */
  export const getBrowser = (userAgent = navigator.userAgent): Browser => {
    if (/chrome/i.test(userAgent) && !/edge/i.test(userAgent)) {
      return Browser.Chrome;
    } else if (/firefox/i.test(userAgent)) {
      return Browser.Firefox;
    } else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) {
      return Browser.Safari;
    } else if (/edge/i.test(userAgent)) {
      return Browser.Edge;
    } else if (/opr/i.test(userAgent)) {
      return Browser.Opera;
    } else {
      return Browser.Unknown;
    }
  };
}
