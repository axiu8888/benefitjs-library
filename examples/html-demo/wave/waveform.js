const waveformCanvas = document.getElementById("waveform");
const thumbnailCanvas = document.getElementById("thumbnail");
const viewfinder = document.getElementById("viewfinder");
const waveformCtx = waveformCanvas.getContext("2d");
const thumbnailCtx = thumbnailCanvas.getContext("2d");

// 设置 canvas 尺寸
waveformCanvas.width = waveformCanvas.clientWidth;
waveformCanvas.height = waveformCanvas.clientHeight;
thumbnailCanvas.width = thumbnailCanvas.clientWidth;
thumbnailCanvas.height = thumbnailCanvas.clientHeight;

const data = generateWaveformData(); // 生成波形数据

let viewfinderWidth = 40; // viewfinder 的初始宽度
let viewfinderX = 0;

let baseLine = waveformCanvas.height * (1 / 4.0);

// 绘制波形图
function drawWaveform(data, ctx, width, height, step) {
  ctx.clearRect(0, 0, width, height);
  ctx.beginPath();
  ctx.moveTo(0, height / 2);

  //const step = Math.ceil(data.length / width);
  for (let i = 0; i < width; i++) {
    const value = data[i * step];
    const y = ((1 - value) * height) / 2;
    ctx.lineTo(i, y);
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
    drawZoomedWaveform();
  }
});

document.addEventListener("mouseup", () => {
  dragging = false;
});

// 根据 viewfinder 绘制缩放后的波形图
function drawZoomedWaveform() {
  const zoomedData = data.slice(
    Math.floor((viewfinderX / thumbnailCanvas.width) * data.length),
    Math.floor(
      ((viewfinderX + viewfinderWidth) / thumbnailCanvas.width) * data.length
    )
  );

  drawWaveform(
    zoomedData,
    waveformCtx,
    waveformCanvas.width,
    waveformCanvas.height,
    5
  );
}

// 初始化绘制
const step = Math.ceil(data.length / thumbnailCanvas.width);
console.log("step: ", step);
drawWaveform(
  data,
  thumbnailCtx,
  thumbnailCanvas.width,
  thumbnailCanvas.height,
  step
);
drawViewfinder();
drawZoomedWaveform();

function generateWaveformData() {
  const array = [];
  for (let i = 0; i < 50000000; i++) {
    array.push(Math.sin(i / 100) * 0.5 + 0.5); // 简单的正弦波数据
  }
  return array;
}
