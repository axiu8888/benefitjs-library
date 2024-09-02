<template>
  <div class="match-parent">
    <canvas id="oximeterCanvas" height="300"></canvas>
  </div>
</template>
>

<script lang="ts">
import { waveview } from '@benefitjs/widgets';
import { log } from "../public/log";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {},
  setup() {
    // 将 ref 暴露给模板
    return {};
  },
  methods: {},
  mounted() {
    const canvas = document.getElementById("oximeterCanvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d", { alpha: true }) as CanvasRenderingContext2D;
    console.log("window.devicePixelRatio ==>: ", window.devicePixelRatio);
    waveview.setCanvasPixelRatio(canvas,
      2.0,// window.devicePixelRatio,
      canvas.clientWidth,
      canvas.clientHeight
    );

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const middleY = canvasHeight / 2;

    // 模拟的血氧数据
    let data: number[] = [];
    let maxDataLength = 500; // 波形图数据的最大长度

    // 绘制波形函数
    function drawWaveform() {
      // 清空画布
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // 设置线条样式
      ctx.strokeStyle = "blue";
      ctx.lineWidth = 2;

      // 开始绘制波形
      ctx.beginPath();
      ctx.moveTo(0, middleY);

      for (let i = 0; i < data.length; i++) {
        const x = (i / maxDataLength) * canvasWidth;
        const y = middleY - data[i];
        ctx.lineTo(x, y);
      }

      ctx.stroke();
    }

    // 更新数据
    function updateData(newValue: number) {
      data.push(newValue);
      if (data.length > maxDataLength) {
        data.shift(); // 删除最旧的数据
      }
    }

    // 模拟血氧数据的实时输入
    function generateOximeterData() {
      // 模拟波形变化，生成随机数据
      const randomValue = Math.sin(Date.now() / 100) * 50 + Math.random() * 10;
      updateData(randomValue);

      drawWaveform();
    }

    // 每20毫秒更新一次波形
    setInterval(generateOximeterData, 20);
  },
};
</script>

<style scoped>
.match-parent {
  width: 100%;
  height: 100%;
}

canvas {
  border: 1px solid black;
  width: 100%;
  height: 300px;
}
</style>
