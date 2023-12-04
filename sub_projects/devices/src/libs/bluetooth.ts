
import { ByteBuf } from '@benefitjs/core';

/**
 * 蓝牙设备
 */
export interface IDevice {
    /**
    * 数据缓冲区，方便解析数据
    */
    readonly buf: ByteBuf;
    /**
     * UUID
     */
    readonly uuid: GattUUID;

    /**
     * 保存数据
     * 
     * @param value 写入的值 
     */
    push(value?: number[]): number[] | undefined;
 }

/**
 * UUID
 */
export interface GattUUID {
    /**
     * 服务的UUID
     */
    service: string;
    /**
     * 监听Service的UUID
     */
    readService: string;
    /**
     * 读取特征的UUID
     */
    readCharacteristic: string;
    /**
     * 读取描述符的UUID
     */
    readDescriptor?: string;
    /**
     * 写入Service的UUID
     */
    writeService?: string;
    /**
     * 写入特征的UUID
     */
    writeCharacteristic?: string;
    /**
     * 写入描述符的UUID
     */
    writeDescriptor?: string;
    /**
     * 通知Service的UUID
     */
    notifyService?: string;
    /**
     * 通知的UUID
     */
    notifyCharacteristic?: string;
    /**
     * 通知特征的描述符UUID
     */
    notifyDescriptor?: string;
    /**
     * MTU：22~512
     */
    mtu: number;
}
