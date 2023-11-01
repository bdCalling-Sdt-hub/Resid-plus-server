const { addChat, getChatByParticipantId } = require("../controllers/chatController");
const { addMessage, getMessageByChatId } = require("../controllers/messageController");

const socketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`ID: ${socket.id} just connected`);
    socket.on('join-room', (data) => {
      //console.log('someone wants to join--->', data);
      socket.join('room' + data.uid);
      socket.emit('join-check', 'You are in room: ' + data.uid);
    });

    socket.on('add-new-chat', async (data) => {
      //console.log("data info---->", data.chatInfo)
      var chat
      if (data?.chatInfo?.participants?.length >= 2) {
        chat = await addChat(data.chatInfo)
      }
      else{
        io.to('room' + data.uid).emit('chat-error', 'Must provide 2 participants')
      }
      socket.join('room' + data.uid)
      console.log("add-new chat--->", chat, data.uid)
      io.to('room' + data.uid).emit('new-chat', chat)
    })
    socket.on("join-chat", async (data) => {
      socket.join('room' + data.uid)
      console.log("join-chat info---->", data)
      const allChats = await getMessageByChatId(data.uid)
      io.to("room" + data.uid).emit('all-messages', allChats)
    })
    socket.on('add-new-message', async (data) => {
      console.log("message info------->", data)
      var message
      if (data && data?.chat && data?.message !== null) {
        message = await addMessage(data)
      }
      else{
        io.to('room' + data?.sender).emit('chat-error', 'Must provide a valid message')
      }
      console.log('new message---------> ', message)
      const allMessages = await getMessageByChatId(message?.chat)
      console.log('all messages list----> ', allMessages)
      io.to('room' + message?.chat).emit('all-messages', allMessages)
    })
    socket.on('get-all-chats', async (data) => {
      const allChats = await getChatByParticipantId(data.uid)
      //console.log('hitting from socket -------->', allChats)
      socket.join('room' + data.uid)
      io.to('room' + data).emit('all-chats', allChats)
    })

    socket.on('leave-room', (data) => {
      if (data?.uid) {
        socket.leave('room' + data.uid);
      }
    });

    socket.on('disconnect', () => {
      console.log(`ID: ${socket.id} disconnected`);
    });
  });
};

module.exports = socketIO;