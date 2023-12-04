import { lstat } from 'node:fs/promises'
import { cwd } from 'node:process'
import { instance } from './global_const';
import { BrowserWindow, contextBridge, ipcRenderer } from 'electron';


export interface BtScanner {
  /**
   * 开始扫描
   */
  start(): void;

  /**
   * 停止扫描
   */
  stop(): void;
}


export const scanner = <BtScanner> {
  
  callback: Function,

  start() {
    if(instance.mainWin) {
      initializer(instance.mainWin);
      console.log('navigator.bluetooth', navigator.bluetooth);
      navigator.bluetooth.requestDevice({
        acceptAllDevices: true
      }).catch((err) => {
        console.error(err);
      });
    } else {
      console.warn('缺少mainWin对象...');
      console.log(process.pid, instance);
    }
  },

  stop() {
    ipcRenderer.send('cancel-bluetooth-request');
  },
}


const callbacks = [];
var initialized = false;
const initializer = (win: BrowserWindow) => {
  if(initialized || !win) {
    return;
  }
  let bluetoothPinCallback: Function;
  let selectBluetoothCallback: Function;
  win.webContents.on('select-bluetooth-device', (event, deviceList, callback) => {
    event.preventDefault()
    selectBluetoothCallback = callback
    console.log(deviceList);
    // const result = deviceList.find((device) => {
    //   console.log(device)
    //   return device.deviceName === 'hex'
    // })

    // if (result) {
    //   callback(result.deviceId)
    // } else {
    //   // The device wasn't found so we need to either wait longer (eg until the
    //   // device is turned on) or until the user cancels the request
    // }
  })

  instance.ipcMain.on('cancel-bluetooth-request', (event) => {
    selectBluetoothCallback('')
  })

  // Listen for a message from the renderer to get the response for the Bluetooth pairing.
  instance.ipcMain.on('bluetooth-pairing-response', (event, response) => {
    console.log("bluetooth-pairing-response")
    bluetoothPinCallback(response)
  })

  win.webContents.session.setBluetoothPairingHandler((details, callback) => {
    console.log("bluetooth-pairing-request")
    bluetoothPinCallback = callback
    // Send a message to the renderer to prompt the user to confirm the pairing.
    win.webContents.send('bluetooth-pairing-request', details)
  })
};

