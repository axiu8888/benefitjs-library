<template>
  <div 
    class="linear-layout"
    :class="[orientationClass, { 'wrap': wrap }]"
    :style="layoutStyle"
  >
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 布局方向：horizontal 或 vertical
  orientation: {
    type: String,
    default: 'horizontal',
    validator: (value) => ['horizontal', 'vertical'].includes(value)
  },
  // 是否换行
  wrap: {
    type: Boolean,
    default: false
  },
  // 子元素间距
  gap: {
    type: [Number, String],
    default: 0
  },
  // 主轴对齐方式 (对应 justify-content)
  gravity: {
    type: String,
    default: 'flex-start',
    validator: (value) => [
      'flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'
    ].includes(value)
  },
  // 交叉轴对齐方式 (对应 align-items)
  crossGravity: {
    type: String,
    default: 'stretch',
    validator: (value) => [
      'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
    ].includes(value)
  },
  // 布局宽度
  width: {
    type: [Number, String],
    default: 'auto'
  },
  // 布局高度
  height: {
    type: [Number, String],
    default: 'auto'
  },
  // 背景颜色
  backgroundColor: {
    type: String,
    default: 'transparent'
  }
});

const orientationClass = computed(() => `orientation-${props.orientation}`);

const layoutStyle = computed(() => ({
  gap: typeof props.gap === 'number' ? `${props.gap}px` : props.gap,
  justifyContent: props.gravity,
  alignItems: props.crossGravity,
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  backgroundColor: props.backgroundColor
}));
</script>

<style scoped>
.linear-layout {
  display: flex;
}

.orientation-horizontal {
  flex-direction: row;
}

.orientation-vertical {
  flex-direction: column;
}

.wrap {
  flex-wrap: wrap;
}
</style>