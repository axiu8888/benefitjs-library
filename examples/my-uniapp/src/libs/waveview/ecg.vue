<template>
  <!--  <div class="instanceDom instanceDomaaaaaa" id="ecgDom" :prop="props" :resize="resizeFlag" :isRender="isRender"
    :packet="packetData" :change:packet="ecgModule.dataChange">
    <canvas id="wvCanvas">不支持canvas</canvas>
  </div> -->

  <!-- <canvas id="wvCanvas" width="500" height="500" style="" canvas-id="waveCanvas" type="2d">不支持canvas</canvas> -->

  <!-- <canvas style="width: 400px; height: 500px;background-color:yellow" canvas-id="wvCanvas" id="wvCanvas" type="2d"></canvas> -->
  <div 
    canvas-id="wvCanvas" 
    id="wvCanvas" 
    type="2d"
    style="width: 680px; height: 500px;background-color:yellow" 
    :packet="packetData" 
    :change:packet="ecgModule.dataChange"
    ></div>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue"

import { uniapp, mqtt, utils, zcenter } from '@benefitjs/uni-plugins';



const props = defineProps({
  data: {
    type: Object,
    default: () => ({
      hr_list: "",
      rr_chest_list: "",
    }),
  },
  appShowStatus: {
    type: Boolean,
    default: true,
  },
  instanceId: {
    type: String,
    default: "",
  },
  isRender: {
    type: Boolean,
    default: false,
    required: true,
  },
})
const resizeFlag = ref(false)
const packetData = ref({})


function mqttInit() {
  try {
    log.debug('===================1');
    // 订阅数据
    let subscriber = {
      onMessage(client, topic, msg) {
        //log.debug(`${client.clientId}, subscriber1 接收到mqtt消息`, topic, msg);
        let packet = zcenter.parseZCenter(msg.payloadBytes);
        packetData.value = packet.ecgList
        log.debug(`${topic}, sn: ${packet.packageSn}, time: ${utils.dateFmt(packet.time * 1000)}`);
      },
      onConnected(client) {
        log.debug(`${client.clientId}, 客户端连接成功`);
      },
      onDisconnected(client) {
        log.debug(`${client.clientId}, 客户端关闭连接`);
      },
      onConnectLost(client, lost) {
        log.debug(`${client.clientId}, 客户端连接断开`, lost);
      },
      onMessageDelivered(client, msg) {
        log.debug(`${client.clientId}, 消息送达`, msg.payloadString);
      },
    };
    const opt = {
      autoReconnectInterval: 5000,
      // host: '192.168.1.198',
      host: 'pr.sensecho.com',
      port: 80,
      path: '/support/mqtt',
      clientId: mqtt.nextClientId('mqtt_test_')
    };
    const client = new mqtt.Client(opt);
    log.debug('client', client)
    client.subscribe(subscriber, 'hardware/11000138');

    client.connect()
    log.debug('===================2');
  } catch (err) {
    log.error(err);
  }
}

onMounted(() => {
  mqttInit()
})




// 波形图大小调整方法
function resize() {
  resizeFlag.value = !resizeFlag.value
}

defineExpose({
  resizeFlag,
  resize,
})

</script>
  
<script lang="renderjs" module="ecgModule">

import { WaveView, setCanvasPixelRatio, createWaveView, createEcg6 } from './wave-view';
import { log } from "../log";

  export default {
    data() {
      return {
        domId: "",
        isRenderChart: false,
        wv: WaveView,
      }
    },
    watch: {
    },
    methods: {
      dataChange(newValue, oldValue, ownerInstanceA, instance){
        //log.debug('包数据', newValue)

        let array = [];
        for (let i = 0; i < 6; i++) {
          array[i] = [...newValue];
        }
        this.wv?.push(...array);
      },
      waveInit(){
        // const dom = document.getElementById('wvCanvas') 
        // log.debug('dom.width',dom?.clientWidth)
        // log.debug('dom ==>: ', dom);
        // log.debug(dom.getContext("2d"));
        // log.debug(dom instanceof HTMLCanvasElement);

        // let max = (x, y) => x > y ? x : y;
        // 设置canvas

        
        const content = document.getElementById('wvCanvas')
        const canvasEle = document.createElement('canvas')
        canvasEle.setAttribute('width', content?.clientWidth) //给canvas设置宽度
        canvasEle.setAttribute('height', content?.clientHeight) //给canvas设置高度
        content.appendChild(canvasEle)
        // log.debug(canvas);
        var ctx = canvasEle.getContext("2d"); //webgl引入
        
        log.debug(ctx)
        
        setCanvasPixelRatio(canvasEle, window.devicePixelRatio, canvasEle?.clientWidth, canvasEle?.clientHeight);
        this.wv = createEcg6(canvasEle);
      }
    },
    mounted() {
      this.$nextTick(()=>{
        setTimeout(()=>{
          this.waveInit()
        }, 1000)
      })
    },
    beforeDestory() {
    },
  }
  </script>
<style lang="scss" scoped>
.instanceDom {
  width: 100%;
  height: 100%;
  color: #fff;
  font-size: 12rpx;
}
</style>
  