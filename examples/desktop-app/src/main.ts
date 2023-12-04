import { createApp } from 'vue'
import "./style.css"
import App from './App.vue'
import './ipc/node-api'
import './ipc/bluetooth-api'

createApp(App)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
