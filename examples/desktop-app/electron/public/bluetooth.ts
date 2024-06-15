import { logger } from "@benefitjs/core";
import { app, BrowserWindow, ipcMain } from "electron";

/**
 * 蓝牙设备
 */
export namespace bluetooth {
  /**
   * 日志打印
   */
  export const log = logger.newProxy("bluetooth", logger.Level.debug);

  let bluetoothPinCallback;
  let selectBluetoothCallback;

  /**
   * 初始化
   * 
   * @param mainWindow 
   */
  export function init(mainWindow: BrowserWindow) {
    mainWindow.webContents.on("select-bluetooth-device", (event, deviceList, callback) => {
        log.info('select-bluetooth-device ==>', deviceList.map(d => <any>{ name: d.deviceName, id: d.deviceId}));
        event.preventDefault();
        selectBluetoothCallback = callback;
        const result = deviceList.find((device) => device.deviceName === "HSRG_11000138");
        if (result) {
          callback(result.deviceId);
        } else {
          // The device wasn't found so we need to either wait longer (eg until the
          // device is turned on) or until the user cancels the request
        }
      }
    );

    ipcMain.on("cancel-bluetooth-request", (event) => {
      log.info('cancel-bluetooth-request ==>', event);
      selectBluetoothCallback("");
    });

    // Listen for a message from the renderer to get the response for the Bluetooth pairing.
    ipcMain.on("bluetooth-pairing-response", (event, response) => {
      log.info('bluetooth-pairing-response ==>', event, response);
      bluetoothPinCallback(response);
    });

    mainWindow.webContents.session.setBluetoothPairingHandler((details, callback) => {
      log.info('bluetooth-pairing-request ==>', details);
      bluetoothPinCallback = callback;
      // Send a message to the renderer to prompt the user to confirm the pairing.
      mainWindow.webContents.send("bluetooth-pairing-request", details);
    });
  }
}
