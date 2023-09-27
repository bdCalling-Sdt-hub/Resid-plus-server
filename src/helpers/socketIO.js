const socketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`ID: ${socket.id} just connected`);
    socket.on('join-room', (data) => {
      console.log(data);
      socket.join('room' + data);
      socket.to('room' + data).emit('join-check', 'You are in room: ' + data);
    });

    socket.on('my-room', (data) => {
      console.log(data);
      socket.join('room' + data);
      socket.to('room' + data).emit('roomcheck', 'My room: ' + data);
    });

    socket.on('send-message', (data) => {
      console.log(data);
      socket.to('room' + data.receiver).emit('inbox', data.message);
    });

    socket.on('disconnect', () => {
      console.log(`ID: ${socket.id} disconnected`);
    });
  });
};

module.exports = socketIO;
