<template>
  <div id="app">
    <h3>{{ title }}</h3>
    <!-- <DragFileUpload></DragFileUpload> -->
    <!-- <DragFileUpload2></DragFileUpload2> -->
    <!-- <qrcode></qrcode> -->
    <!-- <holter></holter> -->
    <!-- <CollectorView></CollectorView> -->
    <!-- <Worker></Worker> -->
    <!-- <xiaofei></xiaofei> -->
    <!-- <ipc></ipc> -->
    <!-- <EcgDemo></EcgDemo> -->
    <!-- <ECGSimulator></ECGSimulator> -->
    <!-- <ECGSimulator2></ECGSimulator2> -->
    <!-- <LinearLayoutDemo></LinearLayoutDemo> -->
    <LinearLayoutDemo2></LinearLayoutDemo2>
    <!-- <multi-wave-view></multi-wave-view> -->
    <!-- <wave-view :deviceId="'01001148'"></wave-view> -->
    <!-- <draggable-waveform style="width: 100%; height: 400px;">拖拽的波形图</draggable-waveform> -->
    <!-- <Waveform2 style="width: 100%; height: 400px;">波形图</Waveform2> -->
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import EcgDemo from "./components/EcgDemo.vue";
import ECGSimulator from "./components/ECGSimulator.vue";
import ECGSimulator2 from "./components/ECGSimulator2.vue";
import Worker from "./components/Worker.vue";
import holter from "./components/holter.vue";
import qrcode from "./components/qrcode.vue";
import CollectorView from "./components/CollectorView.vue";
import WaveView from "./components/WaveView.vue";
import xiaofei from "./components/xiaofei.vue";
import ipc from "./components/ipc.vue";
import Waveform2 from "./components/Waveform2.vue";
import LinearLayoutDemo from "./components/LinearLayoutDemo.vue";
import LinearLayoutDemo2 from "./components/LinearLayoutDemo2.vue";

import { log } from "./public/log";
import MultiWaveView from './components/MultiWaveView.vue';
import DraggableWaveform from './components/DraggableWaveform.vue';
import DragFileUpload from "./components/DragFileUpload.vue";
import DragFileUpload2 from "./components/DragFileUpload2.vue";


log.info("Vue create ...");

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
    WaveView,
    holter,
    qrcode,
    CollectorView,
    Worker,
    xiaofei,
    ipc,
    MultiWaveView,
    DraggableWaveform,
    Waveform2,
    LinearLayoutDemo,
    LinearLayoutDemo2,

    EcgDemo,
    ECGSimulator,
    ECGSimulator2,
    DragFileUpload,
    DragFileUpload2,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "波形绘制",
    };
  },
  methods: {},
  mounted() {
    // const app = document.getElementById("app")!!;
    // log.info("app ==>:", app.style);
  },
};
</script>

<style>
body,
html {
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
}

#app {
  /* font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale; */
  width: 100%;
  height: 100%;
  color: #969696;
  /* background-color: #EBEEF3 */
}
</style>
