const url = require("url");

const WebSocket = require("ws");

const request = require("./request.js");

function bootstrap() {


    Promise.all([

        // fetch devices from api
        new Promise((resolve, reject) => {
            request(`${process.env.BACKEND_URL}/api/devices`, (err, data) => {
                if (err) {

                    reject(err);

                } else {

                    let { body, url } = data;
                    let map = new Map();

                    body.forEach(({ _id, interfaces }) => {
                        interfaces.filter((iface) => {

                            // filter only for ehternet interfaces
                            return iface.type === "ETHERNET";

                        }).filter((iface) => {

                            // filter for transport protocols passed as env variable
                            return process.env.TRANSPORT_FILTER.split(",").includes(iface.transport)

                        }).forEach((iface) => {

                            // map ws endpoint with interface obj
                            map.set(`${url}/${_id}/interfaces/${iface._id}`, iface);

                        });
                    });

                    resolve(map);

                }
            });
        }),

        // connect to websocket events
        new Promise((resolve, reject) => {

            let uri = new url.URL(process.env.BACKEND_URL);
            uri.protocol = (process.env.BACKEND_PROTOCOL === "https" ? "wss" : "ws");
            uri.pathname = "/api/events";

            let ws = new WebSocket(uri);

            ws.on("open", () => {

                console.log("WebSocket connected to: ", ws.url);

                resolve(ws);

            });

            ws.on("error", (err) => {
                console.error(err);
            });

            ws.on("close", () => {

                console.warn("WebSocket conneciton closed, re try...");
                process.exit(1)

            });

        })

    ]).then(([map, ws]) => {

        console.log("Read to bridge traffic, interfaces:", map.size, ws.url);

        require("./handler.js")(map, ws);

    }).catch((err) => {

        console.error(err);
        process.exit(1);

        /*
        setTimeout(() => {
            bootstrap();
        }, 3000);
        */

    });

}


bootstrap();