<!-- The exported code uses Tailwind CSS. Install Tailwind CSS in your dev environment to ensure all styles work. -->

<template>
  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-[1440px] mx-auto bg-white rounded-lg shadow-lg p-6 min-h-[1024px]">
      <!-- 顶部信息栏 -->
      <div class="flex justify-between items-center mb-6">
        <div class="flex items-center space-x-8">
          <div class="text-lg font-medium">
            <span class="text-gray-600">心率：</span>
            <span class="text-red-500">{{ heartRate }}</span>
            <span class="text-gray-600">次/分</span>
          </div>
          <div class="flex items-center space-x-2">
            <i class="fas fa-signal text-green-500"></i>
            <span class="text-gray-600">信号质量：优</span>
          </div>
        </div>
        <div class="text-gray-600">
          {{ currentTime }}
        </div>
      </div>

      <!-- 心电图显示区域 -->
      <div class="relative w-full h-[600px] bg-gray-900 rounded-lg overflow-hidden mb-6">
        <canvas ref="ecgCanvas" class="w-full h-full"></canvas>
        <div class="absolute top-4 left-4 bg-green-500 px-3 py-1 rounded-full text-white text-sm">
          采集中
        </div>
      </div>

      <!-- 控制面板 -->
      <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <button 
          class="!rounded-button px-6 py-2 bg-blue-500 text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
          @click="toggleECG"
        >
          {{ isRunning ? '暂停' : '开始' }}
        </button>
        
        <div class="flex items-center space-x-6">
          <div class="flex items-center space-x-2">
            <span class="text-gray-600">绘制速度：</span>
            <input 
              type="range" 
              min="20" 
              max="100" 
              step="10"
              v-model="drawInterval"
              class="w-32"
            />
            <span class="text-gray-600">{{ drawInterval }}ms</span>
          </div>
          
          <div class="text-gray-600">
            采样率：200 点/秒
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onUnmounted } from 'vue';

const ecgCanvas = ref<HTMLCanvasElement | null>(null);
const ctx = ref<CanvasRenderingContext2D | null>(null);
const isRunning = ref(false);
const drawInterval = ref(40);
const heartRate = ref(75);
const currentTime = ref('');

const dataPoints = ref<number[]>([]);
let animationFrameId: number;
let lastDrawTime = 0;

// 生成模拟的心电数据
const generateECGData = () => {
  const baseAmplitude = 100;
  const noise = Math.random() * 10 - 5;
  const time = Date.now() / 1000;
  const value = Math.sin(time * 2 * Math.PI) * baseAmplitude + noise;
  return value;
};

// 更新时间显示
const updateTime = () => {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN');
};

// 绘制心电图
const drawECG = (timestamp: number) => {
  if (!ctx.value || !ecgCanvas.value) return;

  if (timestamp - lastDrawTime >= drawInterval.value) {
    // 生成新数据点
    const newPoint = generateECGData();
    dataPoints.value.push(newPoint);

    // 保持数据点数量在合理范围内
    if (dataPoints.value.length > 1000) {
      dataPoints.value = dataPoints.value.slice(-1000);
    }

    // 清除画布
    ctx.value.clearRect(0, 0, ecgCanvas.value.width, ecgCanvas.value.height);

    // 绘制网格
    drawGrid();

    // 绘制波形
    ctx.value.beginPath();
    ctx.value.strokeStyle = '#4ade80';
    ctx.value.lineWidth = 2;

    const pointSpacing = ecgCanvas.value.width / 1000;
    const centerY = ecgCanvas.value.height / 2;

    dataPoints.value.forEach((point, index) => {
      const x = index * pointSpacing;
      const y = centerY - point;
      if (index === 0) {
        ctx.value!.moveTo(x, y);
      } else {
        ctx.value!.lineTo(x, y);
      }
    });

    ctx.value.stroke();
    lastDrawTime = timestamp;
  }

  if (isRunning.value) {
    animationFrameId = requestAnimationFrame(drawECG);
  }
};

// 绘制网格
const drawGrid = () => {
  if (!ctx.value || !ecgCanvas.value) return;

  ctx.value.strokeStyle = '#2d3748';
  ctx.value.lineWidth = 0.5;

  // 绘制水平线
  for (let y = 0; y < ecgCanvas.value.height; y += 20) {
    ctx.value.beginPath();
    ctx.value.moveTo(0, y);
    ctx.value.lineTo(ecgCanvas.value.width, y);
    ctx.value.stroke();
  }

  // 绘制垂直线
  for (let x = 0; x < ecgCanvas.value.width; x += 20) {
    ctx.value.beginPath();
    ctx.value.moveTo(x, 0);
    ctx.value.lineTo(x, ecgCanvas.value.height);
    ctx.value.stroke();
  }
};

// 开始/暂停心电图绘制
const toggleECG = () => {
  isRunning.value = !isRunning.value;
  if (isRunning.value) {
    lastDrawTime = 0;
    animationFrameId = requestAnimationFrame(drawECG);
  }
};

// 调整Canvas尺寸
const resizeCanvas = () => {
  if (!ecgCanvas.value) return;
  const canvas = ecgCanvas.value;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
};

onMounted(() => {
  if (ecgCanvas.value) {
    ctx.value = ecgCanvas.value.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  // 更新时间
  updateTime();
  setInterval(updateTime, 1000);

  // 模拟心率变化
  setInterval(() => {
    heartRate.value = Math.floor(Math.random() * 10) + 70;
  }, 5000);
});

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas);
  cancelAnimationFrame(animationFrameId);
});
</script>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}

input[type="range"] {
  -webkit-appearance: none;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #3b82f6;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>

