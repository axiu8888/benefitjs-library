<template>
  <div class="ecg-simulator">
    <div class="controls">
      <button @click="togglePause" :class="{ 'active': !isPaused }">
        {{ isPaused ? '开始' : '暂停' }}
      </button>
    </div>
    <canvas ref="canvas" :width="width" :height="height"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, onBeforeUnmount, ref } from 'vue';

export default defineComponent({
  name: 'ECGSimulator',
  setup() {
    // 标准心电图参数
    const mmPerSecond = 25; // 标准速度25mm/s
    const smallGridMM = 5;  // 每个小格5mm
    const bigGridMM = smallGridMM * 5; // 每个大格25mm (1秒)
    const pointsPerSecond = 200; // 每秒200个点
    
    // 画布尺寸 (以像素为单位)
    const width = ref(1000); // 显示5个大格的宽度 (5秒)
    const height = ref(400); 
    
    // 网格颜色配置
    const gridColors = {
      smallGrid: '#f0f0f0',   // 小网格颜色 - 浅灰色
      bigGrid: '#d8d8d8',     // 大网格颜色 - 中等灰色
      baseline: '#a0a0a0'     // 基线颜色 - 深灰色
    };
    
    // 计算像素与实际尺寸的比例
    const smallGridPx = 30; // 每个小格30像素(代表5mm)
    const bigGridPx = smallGridPx * 5; // 每个大格150像素(25mm)
    
    const canvas = ref<HTMLCanvasElement | null>(null);
    const ecgData = ref<number[]>([]);
    const modelIndex = ref(0);
    const isPaused = ref(false);
    let animationFrameId = 0;
    let lastUpdateTime = 0;

    // 标准心电图模型
    const createEcgModel = (): number[] => {
      const model = Array(pointsPerSecond).fill(0);
      
      // P波 (心房去极化)
      const pStart = 20;
      const pEnd = 28;
      for(let i = pStart; i < pEnd; i++) {
        model[i] = 0.8 * Math.sin((i - pStart) * Math.PI / (pEnd - pStart));
      }
      
      // QRS复合波
      const qrsStart = pStart + 30;
      model[qrsStart] = -0.5;
      model[qrsStart+1] = -0.2;
      model[qrsStart+2] = 1.5;
      model[qrsStart+3] = 1.0;
      model[qrsStart+4] = -0.8;
      model[qrsStart+5] = -0.3;
      
      // T波
      const tStart = qrsStart + 15;
      const tEnd = tStart + 25;
      for(let i = tStart; i < tEnd; i++) {
        model[i] = 0.3 * Math.sin((i - tStart) * Math.PI / (tEnd - tStart));
      }
      
      return model;
    };

    const ecgModel = createEcgModel();

    // 初始化心电图数据
    const initEcgData = () => {
      ecgData.value = Array(width.value).fill(0);
    };

    // 绘制网格系统
    const drawGrid = (ctx: CanvasRenderingContext2D) => {
      // 先绘制小网格 (浅色)
      ctx.strokeStyle = gridColors.smallGrid;
      ctx.lineWidth = 1;
      
      // 水平小网格线
      for(let y = 0; y < height.value; y += smallGridPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width.value, y);
        ctx.stroke();
      }
      
      // 垂直小网格线
      for(let x = 0; x < width.value; x += smallGridPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height.value);
        ctx.stroke();
      }
      
      // 然后绘制大网格 (中等颜色)
      ctx.strokeStyle = gridColors.bigGrid;
      ctx.lineWidth = 1.5;
      
      // 水平大网格线
      for(let y = 0; y < height.value; y += bigGridPx) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width.value, y);
        ctx.stroke();
      }
      
      // 垂直大网格线
      for(let x = 0; x < width.value; x += bigGridPx) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height.value);
        ctx.stroke();
      }
      
      // 最后绘制基线 (深色)
      ctx.strokeStyle = gridColors.baseline;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height.value / 2);
      ctx.lineTo(width.value, height.value / 2);
      ctx.stroke();
      
      // 绘制中央垂直参考线
      ctx.strokeStyle = gridColors.bigGrid;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(width.value / 2, 0);
      ctx.lineTo(width.value / 2, height.value);
      ctx.stroke();
      ctx.setLineDash([]);
    };

    // 切换暂停状态
    const togglePause = () => {
      isPaused.value = !isPaused.value;
      if (!isPaused.value) {
        lastUpdateTime = performance.now();
        startAnimation();
      }
    };

    // 绘制心电图波形
    const drawECGWave = (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = '#00a000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const pixelsPermV = (10 / (smallGridMM / smallGridPx)); // 1mV对应的像素数
      
      for(let x = 0; x < width.value; x++) {
        const y = height.value / 2 - ecgData.value[x] * pixelsPermV;
        if(x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
    };

    // 更新和绘制心电图
    const updateAndDraw = (timestamp: number) => {
      if (isPaused.value) return;
      
      if (!lastUpdateTime) lastUpdateTime = timestamp;
      const elapsed = timestamp - lastUpdateTime;
      
      // 每40ms更新8个点
      if (elapsed >= 40) {
        lastUpdateTime = timestamp - (elapsed % 40);
        
        for(let i = 0; i < 8; i++) {
          ecgData.value.shift();
          ecgData.value.push(ecgModel[modelIndex.value]);
          modelIndex.value = (modelIndex.value + 1) % ecgModel.length;
        }
        
        if (canvas.value) {
          const ctx = canvas.value.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width.value, height.value);
            drawGrid(ctx);
            drawECGWave(ctx);
          }
        }
      }
      
      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    // 开始动画
    const startAnimation = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      animationFrameId = requestAnimationFrame(updateAndDraw);
    };

    // 停止动画
    const stopAnimation = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = 0;
      }
    };

    onMounted(() => {
      initEcgData();
      startAnimation();
    });

    onBeforeUnmount(() => {
      stopAnimation();
    });

    return {
      width,
      height,
      canvas,
      isPaused,
      togglePause
    };
  }
});
</script>

<style scoped>
.ecg-simulator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background-color: #f8f8f8;
}

.controls {
  display: flex;
  gap: 10px;
}

button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

button:hover {
  background-color: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0,0,0,0.3);
}

button.active {
  background-color: #f44336;
}

button.active:hover {
  background-color: #d32f2f;
}

canvas {
  background-color: white;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.1);
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}
</style>