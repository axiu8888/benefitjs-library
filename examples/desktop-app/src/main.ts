import { createApp } from 'vue'
import "./style.css"
import App from './App.vue'
import './public/node-api'
// import './libs/serialport'

createApp(App)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
