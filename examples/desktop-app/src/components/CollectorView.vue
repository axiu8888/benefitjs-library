
<template>
  <div>
    <div>
      <button
        hover-class="button-hover"
        @click="onStartScan"
      >
        扫描蓝牙
      </button>
      <button
        hover-class="button-hover"
        @click="onCancelScan"
      >
        取消扫描
      </button>
      <Button>呵呵</Button>
    </div>
  </div>
</template>

<script>
import { Button } from "ant-design-vue";
import { log } from "../public/log";

export default {
  // `setup` 是一个特殊的钩子，专门用于组合式 API。
  components: {
    Button,
  },
  setup() {
    // 将 ref 暴露给模板
    return {
      title: "",
    };
  },
  methods: {
    onLoad() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
    onStartScan() {
      try {
        navigator.bluetooth
          .getAvailability()
          .then(available => {
            if (available) log.info('This device supports Bluetooth!') 
            else log.info('Doh! Bluetooth is not supported')

            if (available) {
              log.info('扫描蓝牙...');
              navigator.bluetooth
                .requestDevice({
                  filters: [{ namePrefix: 'HSRG' }, { namePrefix: 'Bluetooth BP' }],
                  //optionalServices: [serviceUUID]
                  //acceptAllDevices: true
                })
                .then(device => log.info(device))
                .catch(err => log.error(err))
            }
          })
          .catch(err => log.error(err))
      } catch(err) {
        log.error(err);
      }
    },
    onCancelScan() {
        log.info('取消扫描...');
    },
  },
  onMounted() {
  },
};
</script>

<style>

</style>