<template>
  <div
    id="container"
    class="wvParent"
  >
    <div
      id="wvBg"
      class="wvBg"
    ></div>

    <div id="wv" class="wv">
      <div id="wv_1" style="width: 50%; height: 100%; float: left"></div>
      <div id="wv_2" style="width: 50%; height: 100%; float: right"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { zcenter } from "@benefitjs/devices";
import { waveview } from "@benefitjs/widgets";
import { log } from "../public/log";
import { mqtt } from "../public/mqtt";

const row = 6;
const column = 2;
let wv_array: waveview.View[] = [];

// 订阅采集器数据
let collectorListener: (evt: any) => void;
mqtt.subscribeCollector("01001148", collectorListener = (evt) => {
  let packet = evt as zcenter.Packet;
  log.info("采集器数据:", packet.packageSn, packet);
  if (wv_array.length <= 0) return;
  // 创建
  wv_array.forEach((wv) => {
    let array = new Array<number[]>(row);
    for (let i = 0; i < row; i++) {
      array[i] = [...packet.ecgList];
    }
    wv.push(...array);
  });
});

// 订阅博英数据
let holterListener: (evt: any) => void;
mqtt.subscribeHolter('00195D244F11', holterListener = (evt) => {
  let packet = evt;
  // 12导设备
  log.info(packet);
  let array1 = new Array<number[]>(row * (column / 2));
  array1[0] = [...(packet.I ? packet.I : packet.i)];
  array1[1] = [...(packet.II ? packet.II : packet.iI)];
  array1[2] = [...(packet.III ? packet.III : packet.iII)];
  array1[3] = [...packet.aVR];
  array1[4] = [...packet.aVL];
  array1[5] = [...packet.aVF];
  wv_array[0].push(...array1);
  let array2 = new Array<number[]>(row * (column / 2));
  array2[0] = [...(packet.V1 ? packet.V1 : packet.v1)];
  array2[1] = [...(packet.V2 ? packet.V2 : packet.v2)];
  array2[2] = [...(packet.V3 ? packet.V3 : packet.v3)];
  array2[3] = [...(packet.V4 ? packet.V4 : packet.v4)];
  array2[4] = [...(packet.V5 ? packet.V5 : packet.v5)];
  array2[5] = [...(packet.V6 ? packet.V6 : packet.v6)];
  wv_array[1].push(...array2);
});

onMounted(() => {
  setTimeout(() => {
    let container = document.getElementById("container")!!;
    container.style.width = `${document.body.clientWidth * 0.9}px`;
    container.style.height = `${document.body.clientHeight * 0.9}px`;

    log.info(`width: ${container.style.width}, height: ${ container.style.height}`);

    waveview.createCanvasGridBG(document.getElementById("wvBg") as any);
    const opts = {
      ...waveview.DEFAULT_OPTS,
      scaleRatio: 0.6,
      step: 0.8,
      lineWidth: 1.0,
      strokeStyle: "#00CA83",
    };
    // 创建画布
    for (let i = 0; i < column; i++) {
      let el = document.getElementById(`wv_${i + 1}`) as any;
      wv_array[i] = waveview.createCanvasWaveView(el, row, column / 2, opts);
    }
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
  background-color: #333333;
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
