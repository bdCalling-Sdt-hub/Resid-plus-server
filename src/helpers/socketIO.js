const { addChat, getChatByParticipantId } = require("../controllers/chatController");
const { addMessage, getMessageByChatId } = require("../controllers/messageController");
const { getAllNotification, updateAndGetNotificationDetails } = require("../controllers/notificationController");

const socketIO = (io) => {
  io.on('connection', (socket) => {
    console.log(`ID: ${socket.id} just connected`);
    socket.on('join-room', (data) => {
      console.log('join room request sent----------->', data);
      socket.join('room' + data);
      socket.to('room' + data).emit('join-check', 'You are in room: ' + data);
    });

    socket.on('my-room', (data) => {
      console.log('my room----------->', data);
      socket.join('room' + data);
      socket.to('room' + data).emit('roomcheck', 'My room: ' + data);
    });

    socket.on('add-new-chat', async (data) => {
      const chat = await addChat(data.chatInfo)
      console.log('--------> new chat to be added', chat)
      const messageInfo = data.messageInfo
      messageInfo.chat = chat._id
      const message = await addMessage(messageInfo)
      console.log('--------> new message to be added', message)
      const allMessages = await getMessageByChatId(message.chat)
      console.log('--------> all chats', allMessages)
      socket.to('room' + message.chat).emit('all-messages', allMessages)
    })
    socket.on('add-new-message', async (data) => {
      const message = await addMessage(data)
      console.log('--------> new message to be added', message)
      const allMessages = await getMessageByChatId(message.chat)
      socket.to('room' + message.chat).emit('all-messages', allMessages)
    })
    socket.on('get-all-chats', async (data) => {
      const allChats = await getChatByParticipantId(data)
      //console.log('hitting from socket -------->', allChats)
      socket.to('room' + data).emit('all-chats', allChats)
    })
    socket.on('give-notification', async (data) => {
      if (data.role === 'admin') {
        const allNotification = await getAllNotification('admin')
        console.log('admin-wants-notification-------------->', allNotification)
        socket.emit('admin-notification', allNotification)
      }
    })
    socket.on('update-notification', async (data) => {
      await updateAndGetNotificationDetails(data.userId, data.notificationId)
    })

    socket.on('disconnect', () => {
      console.log(`ID: ${socket.id} disconnected`);
    });
  });
};

module.exports = socketIO;
