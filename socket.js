const { URLSearchParams } = require("url");
const { Worker } = require("worker_threads");

const rewriteURL = require("./helper/rewrite-url.js");

module.exports = (mappings, ws) => {

    let workers = new Set();

    console.log("map", mappings)

    ws.on("message", (msg) => {

        // msg format:
        // see createBridgeRequest in backend:
        // components/devices/class.interface.js
        /*
        {
            "iface": ObjectID
            "socket": Boolean
            "type": String (request)
            "uuid": <uuid v4>
        }
        */

        console.log("Message from backend for bidrigin interface", msg.toString());

        let { iface, type, socket } = JSON.parse(msg);

        // TODO: drop `socket=true` and check instead if `iface.type=ETHERNET`
        if (type === "request" && mappings.i2d.has(iface) && socket) {

            // parse data
            msg = JSON.parse(msg);

            let sp = new URLSearchParams();

            sp.set("socket", "true");
            sp.set("uuid", msg.uuid);
            sp.set("type", "response");
            sp.set("x-auth-token", process.env.AUTH_TOKEN);


            //console.log("msg.interface:", msg.iface, mappings.i2d)

            console.group("bridge request");
            console.log("mappings.i2d get", mappings.i2d.get(msg.iface));
            console.groupEnd();

            let upstream = `${process.env.BACKEND_URL}/api/devices/${mappings.i2d.get(msg.iface)?._id || mappings.i2d.get(msg.iface)}/interfaces/${msg.iface}`;
            let { host, port, socket } = mappings.i2s.get(msg.iface);

            let worker = new Worker("./bridge2.js", {
                workerData: {
                    upstream: `${rewriteURL(upstream)}?${sp.toString()}`,
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
                console.log("Worker exited with code %d: %s", code, upstream);
            });

            worker.once("error", (err) => {
                console.error("Worker died", err, upstream);
            });

        } else {

            console.log("Invalid request", iface, type, socket)

        }
    });

    ws.once("close", () => {

        console.log("WS connection to /connector closed, terminate workers");

        // why close? if the ws connection is dropped
        // there should also be the ws conenction in the workers closed
        // so they must exit on their own
        // instead do here a "force cleanup" after x amount of time
        setTimeout(() => {

            console.log("Terminate %d reamaing active worker", workers.size);

            Array.from(workers).forEach((worker) => {
                worker.terminate();
            });

        }, 3000);

    });

};