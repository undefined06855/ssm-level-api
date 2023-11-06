console.log("starting server...")

let cors_port = 1000

let cors = require("./cors.js")
cors.start(cors_port)

let server = require("./main.js")
server.run()
