#! /usr/bin/node

const { EOL } = require("os");
const {
    isMainThread,
    workerData,
    parentPort
} = require("worker_threads");

const WebSocket = require("ws");
const minimist = require("minimist");


const argv = minimist(process.argv, {
    boolean: ["help"],
    default: {
        upstream: "",
        socket: "tcp",
        host: "",
        port: ""
    }
});


if (!isMainThread) {

    // arguments passed via workerData
    // path argv object with passed data
    Object.assign(argv, workerData);

}


// check arguments if used as cli client or spawend via worker thread
if ((isMainThread && (!argv.upstream || !argv.host)) || argv.help || (!argv.port && argv.socket !== "raw")) {
    console.group("Usage of bridge.js as cli tool:", EOL);
    console.log(`bridge.js --upstream="ws://example.com" --host="127.0.0.1" --port="8080" --socket="tcp"`);
    console.log(`bridge.js --upstream="ws://open-haus.lan/api/foo/bar" --host="172.16.0.11" --socket="udp" --port="53"`);
    console.log(`bridge.js --upstream="ws://127.0.0.1:8080/api/devices/663fc49985397fe02064d60d/interfaces/663fc4a06a1e907dd8e86f0e" --socket="tcp" --host="127.0.0.1" --port="8123"`);
    console.log(`bridge.js --upstream="ws://127.0.0.1:8080/api/devices/663fc4b0490a00181d03486c/interfaces/663fc4b5d6cf46265f713ba4" --host="192.168.2.1" --socket="raw"`, EOL);
    console.log("--upstream\tWebSocket upstream endpoint");
    console.log("--socket\tNetwork socket type: tcp|udp|raw");
    console.log("--host\tHost to connect to");
    console.log("--port\tHost port to connect to");
    console.log("");
    process.exit(1);
}

//console.log(`bridge2.js --upstream="${argv.upstream}" --host="${argv.host}" --port="${argv.port}" --socket="${argv.socket}"`);

// bridge the websocket stream to underlaying network socket
let ws = new WebSocket(argv.upstream);

ws.once("error", (err) => {

    console.error(err);
    process.exit(10);

});

ws.once("close", (code) => {
    console.log("Closed with code", code);
    process.exit();
});

ws.once("open", () => {

    let upstream = WebSocket.createWebSocketStream(ws);

    let socket = require(`./sockets/${argv.socket}.js`)({
        host: argv.host,
        port: argv.port
    });

    upstream.pipe(socket);
    socket.pipe(upstream);

    if (!isMainThread) {
        parentPort.on("message", (msg) => {
            if (msg === "disconnect") {

                ws.close(() => {
                    process.exit(0);
                });

            }
        });
    }

});