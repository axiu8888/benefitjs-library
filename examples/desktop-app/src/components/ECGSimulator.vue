<template>
  <div class="ecg-container">
    <canvas ref="canvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from "vue";

interface ECGPoint {
  x: number;
  y: number;
}

export default defineComponent({
  name: "ECGSimulator",
  setup() {
    const width = 800;
    const height = 300;
    const canvas = ref<HTMLCanvasElement | null>(null);
    const ecgData = ref<number[]>([]);
    const modelIndex = ref(0);

    // 模拟一个心跳周期的ECG波形 (约200个点)
    const createEcgModel = (): number[] => {
      const model = Array(200).fill(0);

      // P波 (心房去极化)
      for (let i = 20; i < 40; i++) {
        model[i] = Math.sin(((i - 20) * Math.PI) / 20) * 15;
      }

      // QRS复合波 (心室去极化)
      model[50] = -25; // Q波
      model[51] = -10;
      model[52] = 40; // R波
      model[53] = 20;
      model[54] = -15; // S波
      model[55] = -5;

      // T波 (心室复极化)
      for (let i = 80; i < 120; i++) {
        model[i] = Math.sin(((i - 80) * Math.PI) / 40) * 20;
      }

      return model;
    };

    const ecgModel = createEcgModel();

    // 初始化心电图数据
    const initEcgData = () => {
      ecgData.value = Array(width).fill(0);
    };

    // 绘制网格线
    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = "#e0e0e0";
      ctx.lineWidth = 1;

      // 水平网格线
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // 垂直网格线
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // 绘制基线
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    // 绘制心电图
    const drawECG = () => {
      if (!canvas.value) return;

      const ctx = canvas.value.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, width, height);
      drawGrid(ctx);

      // 更新数据 - 每帧添加8个新点
      for (let i = 0; i < 8; i++) {
        ecgData.value.shift(); // 移除最旧的数据点
        ecgData.value.push(ecgModel[modelIndex.value]); // 添加新点
        modelIndex.value = (modelIndex.value + 1) % ecgModel.length;
      }

      // 绘制心电图
      ctx.strokeStyle = "#00a000";
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const y = height / 2 - ecgData.value[x];
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      requestAnimationFrame(drawECG);
    };

    onMounted(() => {
      initEcgData();
      drawECG();
    });

    return {
      width,
      height,
      canvas,
    };
  },
});
</script>

<style scoped>
.ecg-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  background-color: #f0f0f0;
}

canvas {
  background-color: white;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
}
</style>
