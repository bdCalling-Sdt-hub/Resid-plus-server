const app = require('./app');
const socketIO = require("./helpers/socketIO");
require('dotenv').config();

const port = process.env.PORT || 3001;

const server = app.listen(port, process.env.API_SERVER_IP,() => {
  console.log(`Resid+ Server is listening on port: ${port}`)
});

//initializing socket io
const socketIo = require('socket.io');
const io = socketIo(server, {cors: {
  origin: [process.env.ALLOWED_CLIENT_URL_WEB, process.env.ALLOWED_CLIENT_URL_DASHBOARD]
}});


socketIO(io);

global.io = io
const socketIOPort = process.env.PORT
server.listen(socketIOPort, process.env.API_SERVER_IP,() => {
  console.log(`Socket Server is listening on port: ${socketIOPort}`);
});