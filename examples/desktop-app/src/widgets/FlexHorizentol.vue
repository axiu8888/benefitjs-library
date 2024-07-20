<template>
  <div :id="id">
  </div>
</template>
<script lang="ts">
import { log } from "../public/log";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
  },
  props: {
    id: {
      type: String,
      required: true,
    },
  },
  setup() {
    // 将 ref 暴露给模板
    return {};
  },
  methods: {},
  mounted() {
    log.info("mounted ...");
  },
  unmounted() {
    log.info("unmounted ...");
  },
};
</script>
<style scoped>
.container {
  display: flex;
  width: 100%; /* Adjust the width of the container as needed */
  height: 100%; /* Adjust the height of the container as needed */
  border: 1px solid black; /* Optional, for visualization */
}
</style>
