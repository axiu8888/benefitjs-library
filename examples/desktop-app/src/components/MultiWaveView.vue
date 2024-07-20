
<template>
  <!-- 绘制多个设备的波形图 -->
  <div>
    <div v-for="subItems in items" :key="subItems[0]">
      <div class="container">
        <div v-for="item in subItems" :key="item" class="child">
          <WaveView :deviceId="item + ''" style="height: 300px"></WaveView>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { log } from "../public/log";
import WaveView from "./WaveView.vue";
import { binary } from "../../../../sub_projects/core/src/libs/binary-helper";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
    WaveView,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      items: <string[][]>[],
    };
  },
  methods: {},
  beforeCreate() {
    log.info("beforeCreate ...");
    let startId = binary.hexToNumber("01001148");
    let x = 2;
    let y = 5;
    let deviceIds = <string[][]>[]; //new Array<string[]>(y);
    for (let i = 0; i < y; i++) {
      deviceIds[i] = [];
      for (let j = 0; j < x; j++) {
        let v = binary.numberToHex(startId, 32, true).toLocaleLowerCase();
        log.info("v ===>:", v, i, j, deviceIds[i]);
        deviceIds[i][j] = v;
        startId++;
      }
    }
    this.items = deviceIds;
  },
  mounted() {
    // log.info("mounted ...");
  },
  unmounted() {
    // log.info("unmounted ...");
  },
};
</script>
<style scoped>
.container {
  display: flex;
  width: 100%;
  height: 100%;
  border: 1px solid black;
}
.child {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
