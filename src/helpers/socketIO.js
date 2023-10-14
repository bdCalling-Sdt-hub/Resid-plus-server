const { addChat, getChatByParticipantId } = require("../controllers/chatController");
const { addMessage, getMessageByChatId } = require("../controllers/messageController");

const socketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`ID: ${socket.id} just connected`);
    socket.on('join-room', (data) => {
      console.log('someone wants to join--->', data);
      socket.join('room' + data.uid.toString());
      io.to('room'+data.uid.toString()).emit('join-check', 'You are in room: ' + data.uid);
    });

    socket.on('add-new-chat', async (data) => {
      const chat = await addChat(data.chatInfo)
      console.log(data.uid)
      io.to('room' + data.uid).emit('new-chat', chat)
    })
    socket.on("join-chat", async (data) => {
      const allChats = await getMessageByChatId(data.uid)
      io.to("room" + data.uid).emit('all-messages', allChats)
    })
    socket.on('add-new-message', async (data) => {
      const message = await addMessage(data)
      console.log('--------> new message to be added', message)
      const allMessages = await getMessageByChatId(message.chat)
      io.to('room' + message.chat).emit('all-messages', allMessages)
    })
    socket.on('get-all-chats', async (data) => {
      const allChats = await getChatByParticipantId(data.uid)
      //console.log('hitting from socket -------->', allChats)
      io.to('room' + data).emit('all-chats', allChats)
    })

    socket.on('disconnect', () => {
      console.log(`ID: ${socket.id} disconnected`);
    });
  });
};

module.exports = socketIO;