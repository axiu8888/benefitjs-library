<!--
 * @Description: 
 * @Date: 2023-05-19 10:13:42
 * @LastEditTime: 2023-05-19 13:29:10
-->
<template>
  <view class="content">
    <div>
      <u-button
        type="primary"
        text="打开蓝牙"
        @click="onOpenBtAdapter"
      ></u-button>
      <span>~~~~ UDP</span>
      <u-button
        type="success"
        text="获取可用的UDP端口"
        @click="activePorts"
      ></u-button>
      <u-button type="warning" text="启动监听端口" @click="startUdp"></u-button>
      <u-button type="error" text="停止监听" @click="stopUdp"></u-button>
      <u-button type="warning" text="监听数据" @click="onMessage"></u-button>
      <span>~~~~</span>
      <u-button type="success" text="OTG上传" @click="onOtgUpload"></u-button>
      <span>~~~~</span>
      <u-button
        type="error"
        text="打开自动加圈"
        @click="onStartAddCircle"
      ></u-button>
      <u-button
        type="warning"
        text="关闭自动加圈"
        @click="onStopAddCircle"
      ></u-button>
    </div>
  </view>
</template>

<script lang="ts">
import { ref } from 'vue'

import { uniapp, udp } from '@benefitjs/uni-plugins'

// 使用UniProxy代理调用
const otgUpload = uniapp.requireNativePlugin('OtgModule')
const autoAddCircle = uniapp.requireNativePlugin('AutoModule')

export default {
  data () {
    return {
      device: '暂无',
      title: '原生插件'
    }
  },
  onLoad () {},
  methods: {
    onOpenBtAdapter () {
      // 打开蓝牙适配器
      uniapp.uniInstance
        .openBtAdapter()
        .then(resp => console.log(JSON.stringify(resp)))
        .catch(err => console.error(err))
    },
    activePorts () {
      udp
        .activePorts()
        .then(resp => {
          console.log('activePorts', resp)
          uni.showToast({
            title: 'then ==>: ' + JSON.stringify(resp),
            icon: 'none'
          })
        })
        .catch(err => {
          console.error('activePorts', err)
          uni.showToast({
            title: 'catch ==>: ' + JSON.stringify(err),
            icon: 'none'
          })
        })
    },
    startUdp () {
      udp.start(
        62014,
        resp => {
          uni.showToast({
            title: '监听的端口: ' + JSON.stringify(resp),
            icon: 'none'
          })
        },
        msg => {
          console.log('接收到UDP数据: ', msg)
        }
      )
    },
    stopUdp () {
      udp.stop(62014, resp => {
        console.log('stop', resp)
        uni.showToast({
          title: 'then ==>: ' + JSON.stringify(resp),
          icon: 'none'
        })
      })
    },
    onOtgUpload () {
      console.log('OTG上传。。。')
      otgUpload
        .gotoNativePage(
          {
            accessToken:
              'eyJhbGciOiJIUzUxMiJ9.eyJkZXBhcnRzIjoiW1wiZjYyMmNlN2M3YWEwNGY2Mjk2OWVhZWQ5MTViMGRkMGNcIl0iLCJvcmdJZCI6ImY2MjJjZTdjN2FhMDRmNjI5NjllYWVkOTE1YjBkZDBjIiwicm9vdE9yZ0lkIjoiZjYyMmNlN2M3YWEwNGY2Mjk2OWVhZWQ5MTViMGRkMGMiLCJ0YXJnZXRBcHAiOiJhcHBTbXd0IiwianRpIjoiYmVlN2Y4M2NmOTI1NGZhM2JlYTVmZWQ1MzdkMGI1YTAiLCJzdWIiOiI3MDI0YWVjZDBiNDc2YTRiMDY2N2Q4YzdjODMxMjc2NCIsImlzcyI6ImhzcmciLCJpYXQiOjE2ODg1NTc5NDQsImV4cCI6MTY4OTE2Mjc0NH0.JBYjwzsCaM4pdXRwNm4OSHYjRBN2JGomvg6MM281NoPAtixvc6nsMJHAL4f8Tk2pPLKMlmsRBAli-Q7fS2MZ7A',
            baseUrl: '192.168.1.198',
            userId: '952dbd28968e47168e34501e2cf393d4'
          },
          res => {
            console.log('otg', res)
          }
        )
        .then(res => console.log(res))
        .catch(err => console.error(err))
    },
    onStartAddCircle () {
      autoAddCircle.init(
        { remoteHome: '255.255.255.255', remotePort: '23333', localPort: 1399 },
        resp => {
          console.log('自动加圈响应', resp, JSON.stringify(resp))
        }
      )
    },
    onStopAddCircle () {
      autoAddCircle.endUdp()
      console.log('support ==>: ' + autoAddCircle.support())
    },
    onMessage () {},
    eventHandler () {}
  }
}
</script>

<style></style>
