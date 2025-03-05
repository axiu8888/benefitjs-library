<template>
  <div
    class="drop-area"
    @dragover.prevent="handleDragOver"
    @drop.prevent="handleDrop"
    @click="handleClick"
  >
    <p>点击、拖动，或者粘贴图片</p>
    <input
      type="file"
      ref="fileInput"
      hidden
      @change="handleFileSelect"
      multiple
    />
  </div>
</template>

<script setup>
import { ref } from "vue";
import { log } from "../public/log";
import { FileUtils } from "../public/fileutils";

const fileInput = ref(null);

const handleDragOver = (event) => {
  event.dataTransfer.dropEffect = "copy";
};

const handleDrop = (event) => {
  const files = event.dataTransfer.files;
  log.info("files", files);
  log.info('------------------------------')
  FileUtils.getFilesFromDataTransfer(files)
    .then(resp => {
      log.info('resp:', resp);
    })
    .catch(err => log.error(err));
  log.info('------------------------------')
  uploadFiles(files);
};

const handleClick = () => {
  fileInput.value.click();
};

const handleFileSelect = (event) => {
  const files = event.target.files;
  uploadFiles(files);
};

const uploadFiles = (files) => {
  log.info("上传文件", files);
  // 这里可以使用 FormData 进行上传
};
</script>

<style>
.drop-area {
  width: 100%;
  height: 100px;
  border: 2px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  text-align: center;
}

.drop-area:hover {
  border-color: #1890ff;
}
</style>
