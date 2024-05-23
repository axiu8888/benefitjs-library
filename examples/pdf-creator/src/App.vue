<template>
  <!-- <Button>你好</Button> -->
  <div v-html="externalContent"></div>
  <iframe
    style="border: none; width: 100%; height: 900px; background-color: white"
    v-bind:src="url"
  ></iframe>
</template>

<script lang="ts">
import { Button } from 'ant-design-vue'
import axios from 'axios';
import { log } from './public/log';
export default {
  methods: {
    changeWidthOrHeight () {
      this._width = innerWidth
      this._height = innerHeight
    }
  },
  data () {
    return {
      url: 'https://www.baidu.com/',
      _width: 0,
      _height: 0,
      externalContent: '',
    }
  },
  mounted () {
    window.onresize = () => {
      // 自适应高宽度
    }
    this.$nextTick(function () {
      // 计算宽高
    })
  },
  created() {
    // 从路由里动态获取 url地址   具体地址看libs下util.js里的 backendMenuToRoute  方法
    // this.url = 'https://www.baidu.com/'

    axios.get(this.url)
      .then(response => {
        log.info('response ==>:', response);
        return response.data;
      })
      .then(data => this.externalContent = data)
      .catch(error => log.error(error));
  },
  // watch: {
  //   '$route': function () {
  //     // 监听路由变化
  //     this.url =  'https://www.baidu.com/'
  //   }
  // }
}
</script>

<style></style>
