import { createApp } from 'vue'
import App from './App.vue'
import Antd from 'ant-design-vue';
// import 'ant-design-vue/dist/antd.css';
import './style.css'
import './antd.less'

import './demos/ipc'
import { log } from './public/log';

log.info('app create...');

// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'
const app = createApp(App);
// app.config.productionTip = false;
app.use(Antd);
app.mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })