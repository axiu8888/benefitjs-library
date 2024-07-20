<template>
  <div :id="wvContainerId" class="match_parent wvParent">
    <canvas :id="wvBgCanvasId" class="match_parent wvBg"></canvas>
    <canvas :id="wvCanvasId" class="match_parent wv"></canvas>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { waveview } from "@benefitjs/widgets";
import { log } from "../public/log";
import { mqtt } from "../public/mqtt";

const _ecg = new Array<number>(200).fill(512);
const _resp = new Array<number>(25).fill(512);
const _spo2 = new Array<number>(50).fill(0);

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  props: {
    deviceId: {
      type: String,
      required: true,
    },
  },
  components: {
    Button,
  },
  data() {
    return {
      wvContainerId: "wvContainer_" + this.deviceId,
      wvBgId: "wvBg_" + this.deviceId,
      wvId: "wv_" + this.deviceId,
      wvCanvasId: "wvCanvas_" + this.deviceId,
      wvBgCanvasId: "wvBgCanvas_" + this.deviceId,
    };
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      wv: waveview.View,
    };
  },
  methods: {},
  mounted() {
    log.info("onMounted, ", this.deviceId);
    log.info("wvBgCanvasId:", this.wvBgCanvasId, "wvCanvasId:", this.wvCanvasId);
    let container = document.getElementById(this.wvContainerId)!!;
    let cs = container.style;
    log.info(`style.width: ${cs.width}, style.height: ${cs.height}`);
    log.info(
      `clientWidth: ${container.clientWidth}, clientHeight: ${container.clientHeight}`
    );
    // 创建画布
    let wvBgCanvas = document.getElementById(this.wvBgCanvasId) as any;
    waveview.setCanvasPixelRatio(
      wvBgCanvas,
      2.0,// window.devicePixelRatio,
      container.clientWidth,
      container.clientHeight
    );
    waveview.createCanvasGridBG(wvBgCanvas);
    log.info(
      `clientWidth: ${wvBgCanvas.clientWidth}, clientHeight: ${wvBgCanvas.clientHeight}, window.devicePixelRatio: ${window.devicePixelRatio}`
    );
    // 波形图
    let wvCanvas = document.getElementById(this.wvCanvasId) as any;
    waveview.setCanvasPixelRatio(
      wvCanvas,
      2.0,//window.devicePixelRatio,
      container.clientWidth,
      container.clientHeight
    );
    this.wv = waveview.createEcgRespSpo2(wvCanvas, (v) => {
      v.models[0].scaleRatio = 0.8;
      v.models[1].scaleRatio = 0.25;
      v.models[2].scaleRatio = 1.0;
    });
    log.info("wv ==>:", this.wv);

    if (!this.collectorListener) {
      // 订阅采集器数据
      let collectorListener: (evt: any) => void = (evt) => {
        let wv = this.wv;
        let packet = evt as any;
        if (!wv) return;
        if (packet.clear) {
          this.lastSn = -1;
          wv.clearView();
          return;
        }
        // 创建
        let sn = packet.packageSn ? packet.packageSn : packet.packetSn;
        if (this.lastSn > 0 && this.lastSn + 1 != sn) {
          wv.push([..._ecg], [..._resp], [..._spo2]); // 丢包填充
          log.info("检测到丢包:", sn, this.lastSn, sn - this.lastSn);
        }
        this.lastSn = sn;
        wv.push(
          [...packet.ecgList],
          packet.respList ? [...packet.respList] : [...packet.rawRespList],
          [...packet.spo2List]
        );

        log.info("采集器数据:", packet.deviceId, sn, packet);
      };
      mqtt.subscribeCollector(this.deviceId, collectorListener);
      this.collectorListener = collectorListener;
    }

    if (!this.onVisible) {
      this.onVisible = () => {
        // log.info("visibilitychange, hidden = " + document.hidden);
        if (document.hidden) this.wv.pause();
        else this.wv.resume();
        this.lastSn = -1;
      };
    }
    // 监听是否在当前页，并置为已读
    document.addEventListener("visibilitychange", this.onVisible);
  },
  unmounted() {
    mqtt.unsubscribeCollector(this.deviceId, this.collectorListener);
    document.removeEventListener("visibilitychange", this.onVisible);
  },
};
</script>

<style scoped>
.match_parent {
  width: 100%;
  height: 100%;
}
.wvParent {
  position: relative;
  background-color: #333333;
}
.wvBg {
  z-index: 1;
}
.wv {
  margin-top: -100%;
}
</style>
