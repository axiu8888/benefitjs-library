<template>
  <div id="draggableWaveformContainerId" class="match-parent">
    <div id="wv-container" class="match-parent wv-parent">
      <canvas id="wvBgCanvasId" class="match-parent wv-bg"></canvas>
      <canvas id="wvCanvasId" class="match-parent wv"></canvas>
    </div>
    <div class="thumbnail-container">
      <canvas id="thumbnailId" class="match-parent"></canvas>
      <div id="viewfinderId" class="viewfinder"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { log } from "../public/log";
import { logger, utils } from "@benefitjs/core";
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
    const getCanvasEL = (id: string) => document.getElementById(id) as HTMLCanvasElement;
    const getCanvasCtx = (target: string | HTMLCanvasElement) => {
      let canvas = (target instanceof HTMLCanvasElement ? target : getCanvasEL(target));
      return canvas.getContext("2d", { alpha: true}) as CanvasRenderingContext2D;
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
      return el.getContext("2d", { alpha: true}) as CanvasRenderingContext2D;
    };

    /**
     * 设置画布的缩放比(为了高显示性)
     */
    const setCanvasScale = function(canvas: string | HTMLCanvasElement, scale: number = 1.0) {
      let cs = canvas instanceof HTMLCanvasElement ? canvas : getCanvasEL(canvas);
      let ctx = getCanvasCtx(canvas);
      ctx.scale(scale, scale);
      cs.style.width = cs.clientWidth + 'px';
      cs.style.height = cs.clientHeight + 'px';
      cs.width = cs.clientWidth * scale;
      cs.height = cs.clientHeight * scale;
    }
    
    /**
     * 绘制背景网格
     *
     * @param canvas 画布
     * @param gridSize 网格大小
     */
     const drawGrid = function (canvas: HTMLCanvasElement, gridSize: number, clearRect: boolean = true) {
      let ctx = canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
      if (clearRect) {
        // 清理
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      // 垂直方向数量
      let verticalCount = Math.floor(canvas.width / gridSize);
      let verticalPadding = (canvas.width - Math.floor(verticalCount * gridSize)) / 2;
      // 水平方向数量
      let horizontalCount = Math.floor(canvas.height / gridSize);
      let horizontalPadding = (canvas.height - Math.floor(horizontalCount * gridSize)) / 2;

      // 垂直线
      for (let i = 0; i <= verticalCount; i++) {
        waveview.setPaint(ctx, i);
        ctx.beginPath();
        ctx.moveTo(verticalPadding + i * gridSize, horizontalPadding);
        ctx.lineTo(verticalPadding + i * gridSize, canvas.height - horizontalPadding);
        ctx.stroke();
      }

      // 水平线
      for (let i = 0; i <= horizontalCount; i++) {
        waveview.setPaint(ctx, i);
        ctx.beginPath();
        ctx.moveTo(verticalPadding, horizontalPadding + i * gridSize);
        ctx.lineTo(canvas.width - verticalPadding, horizontalPadding + i * gridSize);
        ctx.stroke();
      }
    };

    const self = this;

    const draggableWaveformContainer = document.getElementById('draggableWaveformContainerId')!!;

    const wvContainer = document.getElementById("wv-container") as HTMLElement;

    // 绘制背景
    let wvBgCanvas = getCanvasEL("wvBgCanvasId");
    setCanvasScale(wvBgCanvas, 2.0);
    drawGrid(wvBgCanvas, 15, true);
    
    const waveformCanvas = setupGetCanvas("wvCanvasId");
    const thumbnailCanvas = setupGetCanvas("thumbnailId");
    const viewfinder = document.getElementById("viewfinderId") as HTMLElement;

    let viewfinderWidth = 40; // viewfinder 的初始宽度
    let viewfinderX = 0;

    // 绘制波形图
    function drawWaveform(data: number[], ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) {
      const width = ctx.canvas.width;
      const height = ctx.canvas.height;
      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.strokeStyle = "#00DD00";

      let baseLine = height / 2;
      // log.info('baseLine:', baseLine, ', width:', width, ', height:', height);
      for (let i = 0; i < data.length; i++) {
        let y = (512 - data[i]) * scaleY + baseLine;
        ctx.lineTo(i * scaleX, y);
      }
      ctx.stroke();
    }


    function update() {
      const rect = thumbnailCanvas.getBoundingClientRect();
      if (viewfinderX < 0) viewfinderX = 0
      if (viewfinderX + viewfinderWidth > thumbnailCanvas.width)
        viewfinderX = thumbnailCanvas.width - viewfinderWidth
      drawViewfinder()
      drawZoomedWaveform(self.data)
    }

    // 绘制 viewfinder
    function drawViewfinder() {
      viewfinder.style.width = viewfinderWidth + "px";
      viewfinder.style.left = viewfinderX + "px";
    }

    // 事件处理: 拖动 viewfinder
    let viewfinderDragging = false;
    let thumbnailCanvasDragging = false;
    let waveformCanvasDragging = false;
    let waveformCanvasMoveX = 0;
    let drawTimerId: any[] = [];


    const thumbnailCanvasMoveStep = 1;//缩略图的步长
    const waveformCanvasMoveStep = 0.04;//波形拖拽的步长

    viewfinder.addEventListener('mousedown', e => { viewfinderDragging = true; })//滑块被拖动
    thumbnailCanvas.addEventListener('mousedown', e => {
      // log.info('thumbnailCanvas, mousedown, (' + (e.clientX + ', ' + e.clientY) + ')');
      thumbnailCanvasDragging = true;
      if(!drawTimerId[0]) {
        drawTimerId[0] = setInterval(() => {
          viewfinderX += e.clientX > viewfinderX ? thumbnailCanvasMoveStep : -thumbnailCanvasMoveStep;
          update();
        }, 50);
      }
    })//缩略图被拖动
    waveformCanvas.addEventListener('mousedown', e => {
      waveformCanvasDragging = true;
      waveformCanvasMoveX = e.clientX;
    })//波形图被拖动

    draggableWaveformContainer.addEventListener('mousemove', e => {
      if (viewfinderDragging) {
        const rect = thumbnailCanvas.getBoundingClientRect();
        viewfinderX = e.clientX - rect.left - viewfinderWidth / 2
        update();
      } else if (waveformCanvasDragging) {
          // log.info('waveformCanvas, mousedown, (' + (e.clientX + ', ' + e.clientY) + ')');
          viewfinderX += (e.clientX - waveformCanvasMoveX) > 0 ? -waveformCanvasMoveStep : waveformCanvasMoveStep;
          update();
          waveformCanvasMoveX = e.clientX;
      }
    })

    document.addEventListener('mouseup', () => {//鼠标抬起
      viewfinderDragging = false;
      thumbnailCanvasDragging = false;
      waveformCanvasDragging = false
      clearInterval(drawTimerId[0]);
      drawTimerId[0] = undefined;
    })


    // 根据 viewfinder 绘制缩放后的波形图
    function drawZoomedWaveform(data: number[]) {
      const zoomedData = data.slice(
        Math.floor((viewfinderX / thumbnailCanvas.width) * data.length),
        Math.floor(((viewfinderX + viewfinderWidth) / thumbnailCanvas.width) * data.length)
      );
      drawWaveform(zoomedData, getCanvasCtx(waveformCanvas), 1, 0.8); //绘制裁剪的波形
    }

    function setup(data: number[]) {
      self.data = data;
      // 初始化绘制
      const scale = thumbnailCanvas.width / data.length;
      log.log("scale: ", scale, self.data);
      log.log("width:", thumbnailCanvas.width, 'height:', thumbnailCanvas.height, ', data.length:', data.length);
      drawWaveform(data, getCanvasCtx(thumbnailCanvas), scale, 0.3); //绘制缩略图
      drawViewfinder();
      drawZoomedWaveform(data);
    }
 
    // const reportId = '390f02f2afdc4fdbb2bbad06a7ba9899';
    const reportId = 'de92e74a5f704d1b8ba7743b97b85aee';
    axios.get(`https://pr.sensecho.com/support/api/report/data?reportType=smwt&reportId=${reportId}&version=v1`)
      .then(resp => {
        log.info('data:', resp.data);

        const result = resp.data['result'];
        let patientId = result['patientId'];
        let startTime = utils.dateParse(result['start_time']).getTime();
        let endTIme = utils.dateParse(result['end_time']).getTime();
        let url = `https://pr.sensecho.com/support/api/dataReview/ecg?patientId=${patientId}&startTime=${startTime}&endTime=${endTIme}`;
        log.info("url:", url);
        axios
          .get(url, {
            headers: {
              "zCenter":"true",
              "x-access-token": "eyJhbGciOiJIUzUxMiJ9.eyJvcmdJZCI6Ijc4YzI0OGVlZWY2ODQyMjk5NjM2MTVhMmUyOGVjOWJlIiwicm9vdE9yZ0lkIjoiNzhjMjQ4ZWVlZjY4NDIyOTk2MzYxNWEyZTI4ZWM5YmUiLCJqdGkiOiJjOTY2ZGM0NzMzMTY0NTI0YWY0MGMzNGYyZDg5OThjYiIsInN1YiI6ImQwMjU5NTMxMmM4ZDhmYmVlOWVhM2ZkYTE4ODcwYTdmIiwiaXNzIjoiaHNyZyIsImlhdCI6MTcyMzgyMjkyNiwiZXhwIjoxNzI0NDI3NzI2fQ.2_AVUScWuH8zj4r4qF0fYJTiXrrorFHDzcFFcJlLN63PemxnNeVqmSCIk_jtIzLymXyRqp0WrFbb4lX1UgxrKA",
            },
          })
          .then((resp) => {
            // log.info(resp.status, resp.data, resp.headers);
            log.info("请求结果: ", resp.data);
            setup(resp.data["result"]["ecg"]); //绘制
          })
          .catch((err) => log.error(err));

      })
      .catch(err => log.error(err));


    // let patientId = "547bd48e6a514c579b288537e8122972";
    // let startTime = utils.dateParse("2024-06-13 09:43:35").getTime();
    // let endTIme = utils.dateParse("2024-06-13 09:58:10").getTime();
    // let url = `https://pr.sensecho.com/support/api/dataReview/ecg?patientId=${patientId}&startTime=${startTime}&endTime=${endTIme}`;
    // log.info("url:", url);
    // axios
    //   .get(url, {
    //     headers: {
    //       "zCenter":"true",
    //       "x-access-token": "eyJhbGciOiJIUzUxMiJ9.eyJvcmdJZCI6Ijc4YzI0OGVlZWY2ODQyMjk5NjM2MTVhMmUyOGVjOWJlIiwicm9vdE9yZ0lkIjoiNzhjMjQ4ZWVlZjY4NDIyOTk2MzYxNWEyZTI4ZWM5YmUiLCJqdGkiOiJjOTY2ZGM0NzMzMTY0NTI0YWY0MGMzNGYyZDg5OThjYiIsInN1YiI6ImQwMjU5NTMxMmM4ZDhmYmVlOWVhM2ZkYTE4ODcwYTdmIiwiaXNzIjoiaHNyZyIsImlhdCI6MTcyMzgyMjkyNiwiZXhwIjoxNzI0NDI3NzI2fQ.2_AVUScWuH8zj4r4qF0fYJTiXrrorFHDzcFFcJlLN63PemxnNeVqmSCIk_jtIzLymXyRqp0WrFbb4lX1UgxrKA",
    //     },
    //   })
    //   .then((resp) => {
    //     // log.info(resp.status, resp.data, resp.headers);
    //     log.info("请求结果: ", resp.data);
    //     setup(resp.data["result"]["ecg"]); //绘制
    //   })
    //   .catch((err) => log.error(err));
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

.thumbnail-container {
  position: relative;
  width: 100%;
  height: 60px;
  background-color: #333333;
  overflow: hidden;
}

.viewfinder {
  position: absolute;
  height: 100%;
  background-color: rgba(223, 60, 32, 0.4);
  cursor: pointer;
  top: 0;
}
</style>
