import { processEnv } from "@benefitjs/core";
import { log } from "./log";


if(!processEnv.isNode()) {
  throw new Error('仅支持node环境!');
}


// 安装 npm i ws

const ws = require("ws");
const WebSocketServer = ws.Server;

//在4000端口上打开了一个WebSocket Server，该实例由变量wss引用。
const wss = new WebSocketServer({ port: 4000 });

//如果有WebSocket请求接入，wss对象可以响应connection事件来处理这个WebSocket：
wss.on("connection", (ws: any) => {
  //在connection事件中，回调函数会传入一个WebSocket的实例，表示这个WebSocket连接。
  log.info(`[SERVER] connection()`);
  ws.on("message", (message: any) => {
    //我们通过响应message事件，在收到消息后再返回一个ECHO: xxx的消息给客户端。
    log.info(`[SERVER] Received:${message}`);
    ws.send(`ECHO:${message}`, (err: any) => {
      if (err) {
        log.error(`[SERVER] error: ${err}`);
      }
    });
  });
  ws.on("close", (err: any) => {
    log.info(`[SERVER] Closed: ${err}`);
  });
});
