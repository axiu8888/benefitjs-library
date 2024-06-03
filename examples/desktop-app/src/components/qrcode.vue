<template>
  <div id="reader" class="reader"></div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { log } from "../public/log";
import { Html5Qrcode } from "html5-qrcode";

onMounted(() => {
  // This method will trigger user permissions
  Html5Qrcode.getCameras()
    .then((devices) => {
      for (let i = 0; i < devices.length; i++) {
        log.error(`devices[${i}] =>:`, devices[i].id, devices[i].label, devices[i]);
      }

      let cameraId = devices[0].id;
      const html5QrCode = new Html5Qrcode(/* element id */ "reader");
      html5QrCode
        .start(
          cameraId,
          {
            fps: 1, // Optional, frame per seconds for qr code scanning
            qrbox: { width: 350, height: 350 }, // Optional, if you want bounded box UI
          },
          (decodedText, decodedResult) => {
            // do something when code is read
            log.warn('decodedText:', decodedText, ', decodedResult:', decodedResult);
          },
          (errorMessage) => {
            // parse error, ignore it.
            log.debug(errorMessage);
          }
        )
        .catch((err) => {
          // Start failed, handle it.
            log.error(err);
        });
    })
    .catch((err) => {
      // handle err
      log.error("Html5Qrcode.getCameras() ==>:", err);
    });
});
</script>
<style scoped>
.render {
  width: 250px;
  height: 250px;
}
</style>
