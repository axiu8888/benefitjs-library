<template>
  <div class="match-parent">
    <div id="wv-container" class="match-parent wv-parent">
      <canvas id="wvBgCanvasId" class="match-parent wv-bg"></canvas>
      <canvas id="wvCanvasId" class="match-parent wv"></canvas>
    </div>
    <div class="thumbnail-container">
      <canvas id="thumbnailId" class="thumbnail"></canvas>
      <div id="viewfinderId" class="viewfinder"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { log } from "../public/log";
import { utils } from "@benefitjs/core";
import axios from "axios";
import { waveview } from "@benefitjs/widgets";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {};
  },
  methods: {},
  mounted() {
    log.info("onMounted ...");
    const getCanvasEL = (id) => document.getElementById(id) as HTMLCanvasElement;
    const getCanvasCtx = (target: string | HTMLCanvasElement) => {
      if (target instanceof HTMLCanvasElement) {
        return target.getContext("2d") as CanvasRenderingContext2D;
      }
      return getCanvasEL(target).getContext("2d") as CanvasRenderingContext2D;
    };
    const setupGetCanvas = (target: string | HTMLCanvasElement) => {
      let el = target instanceof HTMLCanvasElement 
        ? target
        : document.getElementById(target)!! as HTMLCanvasElement;
      el.width = el.clientWidth;
      el.height = el.clientHeight;
      return el;
    };
    const setupGetCanvasCtx = (id: string | HTMLCanvasElement) => {
      let el = setupGetCanvas(id);
      return el.getContext("2d") as CanvasRenderingContext2D;
    };

    const self = this;

    const wvContainer = document.getElementById("wv-container") as HTMLElement;

    // 绘制背景
    let wvBgCanvas = getCanvasEL("wvBgCanvasId");
    waveview.setCanvasPixelRatio(
      wvBgCanvas,
      2.0,
      wvContainer.clientWidth,
      wvContainer.clientHeight
    );
    waveview.createCanvasGridBG(wvBgCanvas);

    const waveformCanvas = setupGetCanvas("wvCanvasId");
    const thumbnailCanvas = setupGetCanvas("thumbnailId");
    const viewfinder = document.getElementById("viewfinderId") as HTMLElement;

    let viewfinderWidth = 40; // viewfinder 的初始宽度
    let viewfinderX = 0;

    // 绘制波形图
    function drawWaveform(
      data: number[],
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      scale: number
    ) {
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.strokeStyle = "#00FF00";

      let baseLine = height / 2;
      for (let i = 0; i < width; i++) {
        const value = data[i];
        const y = (512 - value) * 0.5 + baseLine;
        ctx.lineTo(i * scale, y);
      }
      ctx.stroke();
    }

    // 绘制 viewfinder
    function drawViewfinder() {
      viewfinder.style.width = viewfinderWidth + "px";
      viewfinder.style.left = viewfinderX + "px";
    }

    // 事件处理: 拖动 viewfinder
    let dragging = false;

    viewfinder.addEventListener("mousedown", (e) => {
      dragging = true;
    });

    document.addEventListener("mousemove", (e) => {
      if (dragging) {
        const rect = thumbnailCanvas.getBoundingClientRect();
        viewfinderX = e.clientX - rect.left - viewfinderWidth / 2;
        if (viewfinderX < 0) viewfinderX = 0;
        if (viewfinderX + viewfinderWidth > thumbnailCanvas.width)
          viewfinderX = thumbnailCanvas.width - viewfinderWidth;
        drawViewfinder();
        drawZoomedWaveform(self.data);
      }
    });

    document.addEventListener("mouseup", () => {
      dragging = false;
    });

    // 根据 viewfinder 绘制缩放后的波形图
    function drawZoomedWaveform(data: number[]) {
      const zoomedData = data.slice(
        Math.floor((viewfinderX / thumbnailCanvas.width) * data.length),
        Math.floor(
          ((viewfinderX + viewfinderWidth) / thumbnailCanvas.width) *
            data.length
        )
      );

      drawWaveform(
        zoomedData,
        getCanvasCtx(waveformCanvas),
        waveformCanvas.width,
        waveformCanvas.height,
        1
      );
    }

    function setup(data: number[]) {
      self.data = data;
      // 初始化绘制
      const scale = thumbnailCanvas.width / data.length;
      log.log("scale: ", scale, self.data);
      drawWaveform(
        data,
        getCanvasCtx(thumbnailCanvas),
        thumbnailCanvas.width,
        thumbnailCanvas.height,
        // scale
        1
      );
      drawViewfinder();
      drawZoomedWaveform(data);
    }


    let patientId = "630b3db047cc41f9a71d0e255b8576ba";
    let startTime = utils.dateParse("2024-07-31 14:31:08").getTime();
    let endTIme = utils.dateParse("2024-07-31 14:38:59").getTime();
    let url = `http://192.168.1.198/support/api/dataReview/ecg?patientId=${patientId}&startTime=${startTime}&endTime=${endTIme}`;
    log.info("url:", url);
    axios
      .get(url, {
        headers: {
          "x-access-token":
            "eyJhbGciOiJIUzUxMiJ9.eyJvcmdJZCI6ImY2MjJjZTdjN2FhMDRmNjI5NjllYWVkOTE1YjBkZDBjIiwicm9vdE9yZ0lkIjoiZjYyMmNlN2M3YWEwNGY2Mjk2OWVhZWQ5MTViMGRkMGMiLCJqdGkiOiIzYTMyODE0MDVlZWY0NThiYWZlZjc0YTU1MzhhNDFiMSIsInN1YiI6IjcwMjRhZWNkMGI0NzZhNGIwNjY3ZDhjN2M4MzEyNzY0IiwiaXNzIjoiaHNyZyIsImlhdCI6MTcyMzcwMjYzOSwiZXhwIjoxNzI0MzA3NDM5fQ.22Vn4k2gkV3P9zFzBD5kfL1WbhiQ9T4UZG2sN35wL2rtXmY3g-_NH0ymMZ5fhLbYdFap1lC1HxYOvJKoYVC0kA",
        },
      })
      .then((resp) => {
        // log.info(resp.status, resp.data, resp.headers);
        log.info("请求结果: ", resp.data);
        setup(resp.data["result"]["ecg"]); //绘制
      })
      .catch((err) => log.error(err));
  },
  unmounted() {
    clearInterval(this.timerId);
  },
};
</script>
<style scoped>
.waveform-container {
  position: relative;
  width: 100%;
  height: 300px;
}

.match-parent {
  width: 100%;
  height: 100%;
}
.wv-parent {
  position: relative;
  background-color: #333333;
}
.wv-bg {
  z-index: 1;
}
.wv {
  margin-top: -100%;
}

/* .waveform {
  width: 100%;
  height: 100%;
  background-color: #333333;
} */

.thumbnail-container {
  position: relative;
  width: 100%;
  height: 100px;
  background-color: #333333;
  margin-top: 10px;
  overflow: hidden;
}

.thumbnail {
  width: 100%;
  height: 100%;
}

.viewfinder {
  position: absolute;
  height: 100%;
  background-color: rgba(223, 60, 32, 0.2);
  border: 1px solid #0000ff;
  cursor: pointer;
  top: 0;
}
</style>
