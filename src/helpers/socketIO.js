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

    socket.on('add-new-chat', async (data) => {
      const chat = await addChat(data.chatInfo)
      //console.log('--------> new chat to be added', chat)
      const messageInfo = data.messageInfo
      messageInfo.chat = chat._id
      const message = await addMessage(messageInfo)
      socket.to('room' + data).emit('all-messages', allChats)
    })
    socket.on('add-new-message', async (data) => {
      const message = await addMessage(data, data.chat)
      //console.log('--------> new message to be added', data)
      const allMessage = await getB(message.chat)
      socket.to('room' + message.chat).emit('all-messages', allMessage)
    })
    socket.on('get-all-chats', async (data) => {
      const allChats = await getByUser(data)
      //console.log('hitting from socket ---------->', allChats)
      socket.to('room' + data).emit('all-chats', allChats)
    })

    socket.on('disconnect', () => {
      console.log(`ID: ${socket.id} disconnected`);
    });
  });
};

module.exports = socketIO;
