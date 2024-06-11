<template>
  <div id="container" class="wvParent">
    <div id="wvBg" class="wvBg">
      <canvas
        id="wvBgCanvas"
        canvas-id="wvBgCanvas"
        style="width: 100%; height: 100%"
      ></canvas>
    </div>

    <div id="wv" class="wv">
      <canvas
        id="wvCanvas"
        canvas-id="wvCanvas"
        style="width: 100%; height: 100%"
      ></canvas>
      <!-- <div id="wv_1" style="width: 50%; height: 100%; float: left"></div> -->
      <!-- <div id="wv_2" style="width: 50%; height: 100%; float: right"></div> -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { collector, zcenter } from "@benefitjs/devices";
import { waveview } from "@benefitjs/widgets";
import { log } from "../public/log";
import { mqtt } from "../public/mqtt";


const _ecg = new Array<number>(200).fill(512);
const _resp = new Array<number>(25).fill(512);
const _spo2 = new Array<number>(50).fill(0);
let lastSn = 0;
let wv: waveview.View;
// 订阅采集器数据
let collectorListener: (evt: any) => void = (evt) => {
  // let packet = evt as zcenter.Packet;
  let packet = evt as any;
  if (!wv) return;
  // 创建
  let sn = packet.packageSn ? packet.packageSn : packet.packetSn;
  if(lastSn > 0 && lastSn + 1 != sn) {
    wv.push([..._ecg], [..._resp], [..._spo2]); // 丢包填充
    log.error('检测到丢包:', sn, lastSn, sn - lastSn);
  }
  lastSn = sn;
  wv.push([...packet.ecgList], [...packet.respList], [...packet.spo2List]);
  
  // log.info("采集器数据:", sn, packet);
};
// mqtt.subscribeCollector("01001148", collectorListener);
// mqtt.subscribeCollector("01000860", collectorListener);
// mqtt.subscribeCollector("01001279", collectorListener);
mqtt.subscribeCollector("01001307", collectorListener);

onMounted(() => {
  // 监听是否在当前页，并置为已读
  document.addEventListener("visibilitychange", () => {
    log.info("visibilitychange, hidden = " + document.hidden);
    if (document.hidden) wv.pause(); 
    else wv.resume();
  });

  setTimeout(() => {
    let container = document.getElementById("container")!!;
    container.style.height = `${document.body.clientHeight * 0.9}px`;
    container.style.width = `${document.body.clientWidth * 0.9}px`;

    log.info(`width: ${container.style.width}, height: ${container.style.height}`);
    log.info(`width: ${container.clientWidth}, height: ${container.clientHeight}`);
    // 创建画布
    let wvBgCanvas = document.getElementById("wvBgCanvas") as any;
    waveview.setCanvasPixelRatio(
      wvBgCanvas,
      window.devicePixelRatio,
      container.clientWidth,
      container.clientHeight
    );
    waveview.createCanvasGridBG(wvBgCanvas);
    // 波形图
    let wvCanvas = document.getElementById(`wvCanvas`) as any;
    waveview.setCanvasPixelRatio(
      wvCanvas,
      window.devicePixelRatio,
      container.clientWidth,
      container.clientHeight
    );
    wv = waveview.createEcgRespSpo2(wvCanvas, v => {
      v.models[1].scaleRatio = 0.20;
    });
    log.info("wv ==>:", wv);
  }, 50);
});
</script>
<style scoped>
.wvParent {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #333333;
}

.wvBg {
  position: absolute;
  z-index: 1;
  width: 100%;
  height: 100%;
  /* background-color: #333333; */
}

.wv {
  position: absolute;
  top: 10px;
  z-index: 2;
  width: 100%;
  height: 100%;
  overflow: hide;
}
</style>
