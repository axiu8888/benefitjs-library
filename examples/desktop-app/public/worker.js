// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

// 定时获取WiFi信息
// setInterval(() => wifiInfo(), 5000);

addEventListener('message', (event) => { console.log('[worker] message =>:', event); });
addEventListener('error', (event) => { console.log('[worker] error =>:', event); });
addEventListener('abort', (event) => { console.log('[worker] abort =>:', event); });


function wifiInfo() {
	var cp = require('child_process');
	cp.exec("cmd /c chcp 65001>null && netsh wlan show interface", (err, res) => {
		var node_nics = require("os").networkInterfaces();
		var lines = res.split('\r\n');
		var fields = [
			'name',
			'model',
			'vendor',
			'mac_address',
			'status',
			'ssid',
			'bssid',
			'mode',
			'radio',
			'authentication',
			'encryption',
			'connection',
			'channel',
			'reception',
			'transmission',
			'signal',
			'profile'
		];
		var connections = [];
		var tmp = {}
		var len = 0;
		for (var i = 3; i < lines.length; i++) {
			if (lines[i] != "" && lines[i] != null && lines[i].indexOf(":") != -1) {
				tmp[fields[len]] = lines[i].split(':')[1].trim()
				len += 1;
			} else {
				if (tmp['name'] != null && tmp['model'] != null && tmp['vendor'] != null && tmp['mac_address'] != null && tmp['status'] != null) {
					var node_nic = node_nics[tmp.name] || [];
					node_nic.forEach(function (type) {
						if (type.family == 'IPv4') {
							tmp.ip_address = type.address;
							let addressSplit = type.address.split('.');
							tmp.ip_gateway = "http://" + addressSplit[0] + "." + addressSplit[1] + "." + addressSplit[2] + ".1"
						}
					});
					connections.push(tmp);
					tmp = {}
					len = 0;
				}
			}
		}
		self.postMessage({ result: res, connections: connections });
	});

	cp.exec('ipconfig');
}