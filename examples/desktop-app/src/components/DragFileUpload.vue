<template>
    <div class="container">
      <div 
        class="drop-zone"
        @dragover.prevent="handleDragOver"
        @dragleave.prevent="dragActive = false"
        @drop.prevent="handleDrop"
        :class="{ 'drag-active': dragActive }"
      >
        <p>拖拽文件或文件夹到这里上传</p>
        <input type="file" multiple @change="handleInputChange" hidden ref="fileInput">
        <button @click="triggerFileInput">或点击选择文件</button>
      </div>
  
      <!-- 上传文件列表 -->
      <div class="file-list">
        <div v-for="file in files" :key="file.id" class="file-item">
          <div class="file-info">
            <span>{{ file.name }}</span>
            <span class="file-size">{{ formatSize(file.size) }}</span>
          </div>
          <div class="progress-container">
            <div 
              class="progress-bar"
              :style="{ width: file.progress + '%' }"
              :class="{ 'error': file.status === 'error' }"
            ></div>
            <span class="status-text">
              {{ getStatusText(file) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import axios from 'axios'
import { log } from '../public/log'
  
  // 文件状态类型
  const FILE_STATUS = {
    PENDING: 'pending',
    UPLOADING: 'uploading',
    DONE: 'done',
    ERROR: 'error'
  }
  
  // 响应式数据
  const dragActive = ref(false)
  const fileInput = ref(null)
  const files = ref([])
  
  // 触发文件选择对话框
  const triggerFileInput = () => {
    fileInput.value.click()
  }
  
  // 处理文件选择
  const handleInputChange = (e) => {
    processFiles([...e.target.files])
  }
  
  // 处理拖拽事件
  const handleDragOver = () => {
    dragActive.value = true
  }
  
  // 处理文件放置
  const handleDrop = async (e) => {
    dragActive.value = false
    const items = e.dataTransfer.items
    
    // 获取所有文件（包括文件夹）
    const fileList = await getFilesFromDataTransfer(items)
    processFiles(fileList)
  }
  
  // 递归获取文件夹中的文件
  const getFilesFromDataTransfer = async (items) => {
    log.info('items:', items)

    const files = []
    
    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry()
        if (entry.isDirectory) {
          const dirFiles = await readDirectory(entry)
          files.push(...dirFiles)
        } else {
          files.push(item.getAsFile())
        }
      }
    }
    
    return files
  }
  
  // 读取目录内容
  const readDirectory = async (directoryEntry) => {
    const files = []
    const reader = directoryEntry.createReader()
    
    const readEntries = async () => {
      const entries = await new Promise((resolve) => reader.readEntries(resolve))
      for (const entry of entries) {
        if (entry.isDirectory) {
          files.push(...await readDirectory(entry))
        } else {
          files.push(await getFileFromEntry(entry))
        }
      }
    }
    
    await readEntries()
    return files
  }
  
  // 从文件入口获取文件对象
  const getFileFromEntry = (entry) => {
    return new Promise((resolve) => entry.file(resolve))
  }
  
  // 处理文件列表
  const processFiles = (fileList) => {
    fileList.forEach(file => {
      files.value.push({
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        raw: file,
        progress: 0,
        status: FILE_STATUS.PENDING
      })
    })
    
    startUpload()
  }
  
  // 开始上传
  const startUpload = async () => {
    for (const file of files.value.filter(f => f.status === FILE_STATUS.PENDING)) {
      try {
        file.status = FILE_STATUS.UPLOADING
        log.info('file:', file)
        
        const formData = new FormData()
        formData.append('file', file.raw)
        
        // await axios.post('http://192.168.1.198/api/file/uplods', formData, {
        //   onUploadProgress: (progressEvent) => {
        //     file.progress = Math.round(
        //       (progressEvent.loaded * 100) / progressEvent.total
        //     )
        //   }
        // })
        
        file.status = FILE_STATUS.DONE
      } catch (error) {
        console.error('Upload failed:', error)
        file.status = FILE_STATUS.ERROR
        file.progress = 0
      }
    }
  }
  
  // 格式化文件大小
  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  // 获取状态显示文字
  const getStatusText = (file) => {
    switch (file.status) {
      case FILE_STATUS.PENDING: return '等待上传'
      case FILE_STATUS.UPLOADING: return `${file.progress}%`
      case FILE_STATUS.DONE: return '上传成功'
      case FILE_STATUS.ERROR: return '上传失败'
      default: return ''
    }
  }
  </script>
  
  <style scoped>
  .container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 20px;
  }
  
  .drop-zone {
    border: 2px dashed #ccc;
    border-radius: 10px;
    padding: 3rem;
    text-align: center;
    transition: all 0.3s ease;
  }
  
  .drop-zone.drag-active {
    border-color: #2196F3;
    background-color: rgba(33, 150, 243, 0.1);
  }
  
  button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
  
  .file-list {
    margin-top: 2rem;
  }
  
  .file-item {
    background: #f5f5f5;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .file-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .file-size {
    color: #666;
    font-size: 0.9em;
  }
  
  .progress-container {
    height: 25px;
    background: #eee;
    border-radius: 4px;
    position: relative;
    overflow: hidden;
  }
  
  .progress-bar {
    height: 100%;
    background: #4CAF50;
    transition: width 0.3s ease;
  }
  
  .progress-bar.error {
    background: #f44336;
  }
  
  .status-text {
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: white;
    font-size: 0.9em;
  }
  </style>