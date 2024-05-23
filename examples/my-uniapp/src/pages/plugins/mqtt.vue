<!--
 * @Description: 
 * @Date: 2023-05-19 10:13:42
 * @LastEditTime: 2023-05-19 13:29:10
-->
<template>
  <view class="content">
    <!-- 、primary、success、warning、error、 -->
    <div>
      <u-button type="primary" text="连接MQTT" @click="onConnect"></u-button>
      <u-button type="success" text="断开MQTT" @click="onDisconnect"></u-button>
      <span>~~~~</span>
      <u-button type="primary" text="发布消息" @click="onPublish"></u-button>
      <span>~~~~</span>
      <u-button type="warning" text="订阅主题" @click="onSubscribe"></u-button>
      <u-button type="u-info" text="取消订阅" @click="onUnsubscribe"></u-button>
      <u-button
        type="error"
        text="取消全部"
        @click="onUnsubscribeAll"
      ></u-button>
    </div>
    <u--input
      placeholder="请输入主题"
      border="surround"
      v-model="topic"
      @change="change"
    ></u--input>
    <u--input
      placeholder="请输入消息"
      border="surround"
      v-model="payload"
      @change="change"
    ></u--input>
  </view>
</template>

<script lang="ts">
import { log } from '@/libs/log'
import { mqtt, utils } from '@benefitjs/core'
import { zcenter } from '@benefitjs/uni-plugins'

var client = new mqtt.Client(<mqtt.MqttOptions>{
  autoReconnectInterval: 5000,
  // host: '192.168.1.198',
  host: 'pr.sensecho.com',
  port: 80,
  path: '/support/mqtt',
  clientId: mqtt.nextClientId('mqtt_test_')
})
// log.debug('mqttClient', mqttClient);

// 订阅数据
let subscriber1 = <mqtt.MqttSubscriber>{
  onMessage(client, topic, msg) {
    // log.debug(`${client.clientId}, subscriber1 接收到mqtt消息`, topic, msg);
    let packet = zcenter.parseZCenter(msg.payloadBytes)
    log.debug(
      `${topic}, sn: ${packet.packageSn}, time: ${utils.dateFmt(
        packet.time * 1000
      )}`
    )
  },
  onConnected(client) {
    log.debug(`${client.clientId}, 客户端连接成功`)
  },
  onDisconnected(client) {
    log.debug(`${client.clientId}, 客户端关闭连接`)
  },
  onConnectLost(client, lost) {
    log.debug(`${client.clientId}, 客户端连接断开`, lost)
  },
  onMessageDelivered(client, msg) {
    log.debug(`${client.clientId}, 消息送达`, msg)
  }
}
let subscriber2 = <mqtt.MqttSubscriber>{
  onMessage(client, topic, msg) {
    log.debug(`${client.clientId}, subscriber2 接收到mqtt消息`, topic, msg)
  }
}

export default {
  data() {
    return {
      device: '暂无',
      title: '原生插件',
      topic: '/test/abc1',
      payload: '消息'
    }
  },
  onLoad() {},
  methods: {
    change(e: any) {},
    onConnect() {
      client.subscribe(subscriber1, 'hardware/11000138')
      client.connect()
    },
    onDisconnect() {
      client.disconnect()
    },
    onPublish() {
      client.publish('/test/abc', this.msg ? this.msg : 'hello 好')
    },
    onSubscribe() {
      client.subscribe(subscriber2, '/test/abc1')
      client.subscribe(subscriber2, '/test/abc3')
    },
    onUnsubscribe() {
      client.unsubscribe(subscriber2, '/test/abc1')
      client.unsubscribe(subscriber2, '/test/abc3')
    },
    onUnsubscribeAll() {
      client.unsubscribe(subscriber1)
      client.unsubscribe(subscriber2)
    }
  }
}

// setTimeout(() => {

//   log.debug('--------------------------------------------------');
//   let start = Date.now();
//   try {
//     // log.debug('/0112/event/bind/msg ==>: ' + slice('/0112/event/bind/msg', TOPIC_SLICER));
//     log.debug("1. true #/event/+/msg  &&  0112/event/bind/msg ==>: " + (getTopic("#/event/+/msg").match("0112/event/bind/msg")));
//     log.debug("2. true #/event/+/msg  &&  0112/event/bind/msg ==>: " + (getTopic("#/event/+/msg").match("0112/person/event/bind/msg")));
//     log.debug("3. #/event/+/msg  &&  0112//event/bind/msg ==>: " + (getTopic("#/event/+/msg").match("0112//event/bind/msg")));
//     log.debug("4. #/event/+/msg  &&  /0112/event/bind/msg ==>: " + (getTopic("#/event/+/msg").match("/0112/event/bind/msg")));
//     log.debug("5. /#/event/+/msg  &&  /0112/event/bind/msg ==>: " + (getTopic("/#/event/+/msg").match("/0112/event/bind/msg")));
//     log.debug("6. /event/#/event/+/msg  &&  /0112/event/bind/msg ==>: " + (getTopic("/event/#/event/+/msg").match("/0112/event/bind/msg")));
//     log.debug("7. #/+/msg  &&  0112/event/bind/msg ==>: " + (getTopic("#/+/msg").match("0112/event/bind/msg")));
//     log.debug("8. #/+/msg  &&  0112/person/event/bind/msg ==>: " + (getTopic("#/+/msg").match("0112/person/event/bind/msg")));
//     log.debug("9. /#/+/msg  &&  0112/person/event/bind/msg ==>: " + (getTopic("/#/+/msg").match("0112/person/event/bind/msg")));
//     log.debug("10. #  &&  0112/person/event/bind/msg ==>: " + (getTopic("#").match("0112/person/event/bind/msg")));
//     log.debug("11. +  &&  0112/person/event/bind/msg ==>: " + (getTopic("+").match("0112/person/event/bind/msg")));
//     log.debug("12. person/+  &&  person/0112 ==>: " + (getTopic("person/+").match("person/0112")));
//     log.debug("13. person/+/+  &&  person/0112/22222 ==>: " + (getTopic("person/+/+").match("person/0112/22222")));
//     log.debug("14. person/+/+  &&  person/0112/22222/ssss ==>: " + (getTopic("person/+/+").match("person/0112/22222/ssss")));
//     log.debug("15. person/+/#  &&  person/0112/22222/ssss ==>: " + (getTopic("person/+/#").match("person/0112/22222/ssss")));
//     log.debug("16.  &&  person ==>: " + (getTopic("").match("person")));
//     log.debug("17. +  &&  person ==>: " + (getTopic("+").match("person")));
//     log.debug("18. +/  &&  person ==>: " + (getTopic("+/").match("person")));
//     log.debug("19. +/  &&  person/ ==>: " + (getTopic("+/").match("person/")));
//     log.debug("20. +/  &&  person/aabb ==>: " + (getTopic("+/").match("person/aabb")));
//     log.debug("21. +/+  &&  person/ ==>: " + (getTopic("+/+").match("person")));
//     log.debug("22. event/+/+/+  &&  event/collector/bindSpo2/01000384 ==>: " + (getTopic("event/+/+/+").match("event/collector/bindSpo2/01000384")));
//     log.debug("23. event/+/+/+/+  &&  event/collector/bindSpo2/01000384 ==>: " + (getTopic("event/+/+/+/+").match("event/collector/bindSpo2/01000384")));
//   } catch(err) {
//     log.error(err);
//   }
//   log.debug("elapsed: " + (Date.now() - start));
//   log.debug('--------------------------------------------------');

// }, 1000);
</script>

<style></style>
