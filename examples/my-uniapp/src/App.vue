<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { log } from "./libs/log";
onLaunch(() => {
  log.debug("App Launch");
});
onShow(() => {
  log.debug("App Show");
});
onHide(() => {
  log.debug("App Hide");
});
</script>
