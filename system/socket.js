const WebSocket = require("ws");

module.exports = ({ upstream, socket, host, port }) => {

    let ws = new WebSocket(upstream);
    let wsStream = WebSocket.createWebSocketStream(ws);

    let stream = require(`../sockets/${socket}.js`)({
        host,
        port
    });

    wsStream.pipe(stream);
    stream.pipe(wsStream);

};