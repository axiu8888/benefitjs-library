<template>
  <div>
    <h2>IPC通信</h2>

    <div>
      <Button hover-class="button-hover" @click="checkPermission"
        >检查权限</Button
      >
      <button hover-class="button-hover" @click="htmlToPdf">生成PDF</button>
    </div>
  </div>
</template>

<script lang="ts">
import { Button } from "ant-design-vue";
import { binary, logger, utils } from "@benefitjs/core";
import { ElectronRender } from "../../libs/electron-render";
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
      ws: WebSocket,
    };
  },
  methods: {
    onLoad() {
      log.info("arguments ==>: ", arguments);
      //setTimeout(() => ipcRenderer.send("htmlToPdf", this.url), 5000);
    },
    checkPermission() {
      try {
        log.log("是否为渲染进程: ", ElectronRender.isProcess());
      } catch (err) {
        log.error(err);
      }
    },
    htmlToPdf() {
      // let url = "https://pr.sensecho.com/supportReport/sportRecory?version=null&reportId=d104d411ac1242a385aa9d2f2ab2918f&extend=null";
      // let url = "https://pr.sensecho.com/supportReport/omsst?version=null&reportId=a29721deef244d74a9249d993fab9feb&extend=pfTest,hrv";
      let url = "https://pr.sensecho.com/reportPages/CAT.html?reportZid=9029725&reportType=CAT&orgZid=34&zid=6b2a4570321b4190b259bf5d5d32ef02&taskZid=9029725&login=gdszf_hsrg&reportPath=true";
      const searchParams = new URLSearchParams(url.substring(url.indexOf("?")));
      let reportType = "";
      let reportId = "test";
      try {
        reportType = find(searchParams, ['item', 'reportType', 'type']);
        if (!reportType) {
          reportType = url.substring(0, url.indexOf("?"));
          reportType = reportType.substring(reportType.lastIndexOf("/"));
          reportType = reportType ? reportType : "";
        }
        reportId = find(searchParams, ['reportId', 'id', 'reportZid', 'zid', 'taskId']);
        

        function find(searchParams: URLSearchParams, keys: string[], filter: Function = (v, k, i) => v != null && v.length > 0): any {
          for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            let value = searchParams.get(key);
            if (filter(value, key, i)) {
              return value;
            }
          }
        }

      } catch (err) {
        log.error(err);
        return;
      }

      (String.prototype as any).replaceAll = function (FindText: string, RepText: string) {
        let regExp = new RegExp(FindText, "gm");
        return this.replace(regExp, RepText);
      }
      const pdfPath = `${process.cwd()}/dist/pdf/${reportType}__${reportId}.pdf`.replace(/\\/gm, '/').replace(/\/\//gm, '/');
      log.info('pdfPath ==>: ' + pdfPath);
      ElectronRender.ipc
        .invoke("ElectronMain", "htmlToPdf", { url: url, pdfPath: pdfPath })
        .then((res) => log.info("htmlToPdf", res))
        .catch((e) => log.error("htmlToPdf", e));
    },
  },
  onMounted() {
    log.info("onMounted ...");
  },
};
</script>

<style></style>
