const { URLSearchParams } = require("url");
const { Worker } = require("worker_threads");


module.exports = (map, ws) => {
    ws.on("message", (msg) => {

        console.log("Message from backend for bidrigin interface", msg.toString());

        // parse data
        msg = JSON.parse(msg);

        let sp = new URLSearchParams();

        sp.set("socket", "true");
        sp.set("uuid", msg.uuid);
        sp.set("type", "response");
        sp.set("x-auth-token", process.env.AUTH_TOKEN);


        console.log("interface url mapping", map);

        let upstream = `${process.env.BACKEND_URL}/api/devices/${msg.device}/interfaces/${msg.interface}`;
        let { host, port, socket } = map.get(upstream).settings;

        let worker = new Worker("./bridge2.js", {
            workerData: {
                upstream: `${upstream.replace("http", "ws")}?${sp.toString()}`,
                host,
                port,
                socket
            },
            env: process.env
        });

        worker.once("online", () => {
            console.log("Worker spawend for url %s", upstream);
        });

        worker.once("exit", (code) => {
            console.log("Worker exited with code %d: %s", code, upstream)
        });

        worker.once("error", (err) => {
            console.error("Worker died", err, upstream);
        });

    });
};