const logger = require("../helpers/logger");
const Chat = require("../models/Chat");

exports.addChat = async (chatInfo) => {
  try {
    console.log(chatInfo?.participants)
    const existingChat = await Chat.findOne({ participants: chatInfo?.participants });

    if (existingChat) {
      return existingChat;
    } else {
      const newChat = await Chat.create({ participants: chatInfo.participants });
      return newChat;
    }
  } catch (error) {
    logger.error(error, 'from: add-chat')
    console.log(error)
    return null;
  }
}
exports.getChatById = async (id) => {
  try {
    const chat = await Chat.findById(id);
    console.log(id, chat)
    if (chat) {
      return chat;
    }
    else {
      return null;
    }
  } catch (err) {
    logger.error(err, 'from: get chat by id')
    console.error(err);
    return null;
  }
};
exports.getChatByParticipantId = async (id) => {
  try {
    const chat = await Chat.find({ participants: id })
      .populate('participants')
    console.log(id, chat)
    if (chat.length > 0) {
      return chat;
    }
    else {
      return null;
    }
  } catch (err) {
    logger.error(err, 'from: get chat by participant id')
    console.error(err);
    return null;
  }
};
exports.deleteChatById = async (id) => {
  try {
    const chat = await Chat.findByIdAndDelete(id);
    if (chat) {
      return chat;
    } else {
      return null;
    }
  } catch (error) {
    logger.error(error, 'from: delete-chat')
    console.log(error)
  }
}