<template>
  <div class="layout-item" :style="itemStyle">
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  weight: {
    type: Number,
    default: null
  },
  gravity: {
    type: String,
    default: null,
    validator: (value) => value === null || [
      'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
    ].includes(value)
  },
  minWidth: {
    type: [Number, String],
    default: null
  },
  maxWidth: {
    type: [Number, String],
    default: null
  },
  minHeight: {
    type: [Number, String],
    default: null
  },
  maxHeight: {
    type: [Number, String],
    default: null
  }
});

const itemStyle = computed(() => {
  const style = {
    flex: props.weight !== null ? props.weight : 'none',
    alignSelf: props.gravity
  };

  // 处理宽度限制
  if (props.minWidth) {
    style.minWidth = typeof props.minWidth === 'number' 
      ? `${props.minWidth}px` 
      : props.minWidth;
  }
  if (props.maxWidth) {
    style.maxWidth = typeof props.maxWidth === 'number' 
      ? `${props.maxWidth}px` 
      : props.maxWidth;
  }

  // 处理高度限制
  if (props.minHeight) {
    style.minHeight = typeof props.minHeight === 'number' 
      ? `${props.minHeight}px` 
      : props.minHeight;
  }
  if (props.maxHeight) {
    style.maxHeight = typeof props.maxHeight === 'number' 
      ? `${props.maxHeight}px` 
      : props.maxHeight;
  }

  return style;
});
</script>

<style scoped>
.layout-item {
  box-sizing: border-box;
  /* 确保元素可以收缩到最小尺寸 */
  flex-shrink: 1;
}
</style>

<!-- <template>
  <div class="layout-item" :style="itemStyle">
    <slot></slot>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  // 权重 (类似 android:layout_weight)
  weight: {
    type: Number,
    default: null
  },
  // 对齐方式 (类似 android:layout_gravity)
  gravity: {
    type: String,
    default: null,
    validator: (value) => value === null || [
      'flex-start', 'flex-end', 'center', 'stretch', 'baseline'
    ].includes(value)
  },
  // 最小宽度
  minWidth: {
    type: [Number, String],
    default: null
  },
  // 最小高度
  minHeight: {
    type: [Number, String],
    default: null
  }
});

const itemStyle = computed(() => ({
  flex: props.weight !== null ? props.weight : 'none',
  alignSelf: props.gravity,
  minWidth: props.minWidth ? (typeof props.minWidth === 'number' ? `${props.minWidth}px` : props.minWidth) : null,
  minHeight: props.minHeight ? (typeof props.minHeight === 'number' ? `${props.minHeight}px` : props.minHeight) : null
}));
</script>

<style scoped>
.layout-item {
  box-sizing: border-box;
}
</style> -->