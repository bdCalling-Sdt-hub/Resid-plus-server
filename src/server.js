const app = require('./app');
const socketIO = require("./helpers/socketIO");
require('dotenv').config();

const port = process.env.PORT || 3001;

const server = app.listen(port, '138.68.184.31',() => {
  console.log(`Resid+ is listening on port: ${port}`)
});

//initializing socket io
const socketIo = require('socket.io');
const io = socketIo(server, {cors: {
  origin: process.env.ALLOWED_CLIENT_URLS
}});


socketIO(io);

global.io = io
const socketIOPort = process.env.PORT
server.listen(socketIOPort, '138.68.184.31',() => {
  console.log(`Server is listening on port: ${socketIOPort}`);
});