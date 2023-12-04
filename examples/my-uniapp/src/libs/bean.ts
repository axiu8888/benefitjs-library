/**
 * 运动数据
 */
export namespace sport {

    /**
     * 运动数据
     */
    export interface Body {
        /**
         * 患者ID
         */
        personZid: string,
        /**
         * 设备ID: 采集器
         */
        deviceId: string,
        /**
         * 项目类型
         */
        itemType: string,
        /**
         * MAC地址
         */
        mac: string,
        /**
         * 蓝牙名
         */
        bleName: string,
        /**
         * 数据
         */
        points: Point[],
    }

    /**
     * 实时运动数据
     */
    export interface Point {
        /**
         * 患者ID
         */
        personZid: string
        /**
         * 执行时的采集器设备ID
         */
        deviceId: string,
        /**
         * 时间
         */
        time: number,
        /**
         * MAC地址
         */
        mac: string,
        /**
         * 处方类型
         */
        itemType: string,
        /**
         * 阶段
         */
        stage: string,
        /**
         * 机器状态
         */
        machineState: string,
        /**
         * 实时转速
         */
        rotateSpeed: number,
        /**
         * 阻力档位
         */
        resistanceGears: number,
        /**
         * 目标坡度
         */
        targetSlope: number,
        /**
         * 目标坡度AD值
         */
        slopeADValue: Boolean,
        /**
         * 运行时间
         */
        duration: number,
        /**
         * 运行距离
         */
        distance: number,
        /**
         * 运行热量
         */
        heat: number,
        /**
         * 卡路里
         */
        calorie: number,
        /**
         * 心率
         */
        hr: number,
        /**
         * 故障	0：无故障，0x80：安全锁脱落，其它：显示对应的故障码
         */
        breakdown: number,
        /**
         * 实时速度
         */
        speed: number,
        /**
         * 代谢当量
         */
        metabolicEquivalent: number,
        /**
         * 功率
         */
        power: number,
        /**
         * 目标速度
         */
        targetSpeed: number,

    }


    /**
     * 处方MQTT信息
     */
    export interface MqttMessage {
        /**
         * 时间
         */
        time: number,
        /**
         * 开始时间
         */
        startTime: number,
        /**
         * 项目
         */
        item: string,
        /**
         * 项目名称
         */
        itemName: string,
        /**
         * 患者ID
         */
        personZid: string,
        /**
         * 机构ID
         */
        orgZid: string,
        /**
         * 患者名
         */
        personName: string,
        /**
         * 性别：男-女
         */
        gender: string,
        /**
         * HIS ID
         */
        hsId: string,
        /**
         * 出生日期
         */
        birthDate: number
        /**
         * 年龄
         */
        age: number,
        /**
         * 身高
         */
        height: number,
        /**
         * 体重
         */
        weight: number,
        /**
         * 采集器设备ID
         */
        deviceId: string,

        //--------------------------------
        /**
         * 器械ID：H1、A4、功率车、椭圆机...
         */
        instrumentId: string,

        /**
         * 运动阶段
         */
        stage: string,
        /**
         * 运动阶段名称
         */
        stageName: string,

        /**
         * 剩余时长
         */
        remaining: number,

        /**
         * 收缩压
         */
        systolic: number,
        /**
         * 舒张压
         */
        diastolic: number,

        /**
         * 靶心率范围（低）
         */
        hrLow: number,
        /**
         * 靶心率范围（高）
         */
        hrHigh: number,
        /**
         * 实时心率
         */
        hr: number,
        /**
         * 实时呼吸率
         */
        rr: number,
        /**
         * 实时血氧
         */
        spo2: number,
        /**
         * 实时速度
         */
        speed: number,
        /**
         * 实时功率或设置的目标功率
         */
        power: number,
        /**
         * 实时距离
         */
        distance: number,
        /**
         * 实时转速
         */
        rotateSpeed: number,

    }

}
