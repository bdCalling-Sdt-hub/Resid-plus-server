const mongoose = require("mongoose");
const Message = require('../models/Message');
const logger = require("../helpers/logger");

exports.addMessage = async (messageInfo) => {
  try {
    const newMessage = new Message(messageInfo);
    await newMessage.save();
    return newMessage;
  } catch (err) {
    logger.error(err, 'from: add-message')
    console.error(err);
    return null;
  }
};
exports.getById = async (id) => {
  try {
    const message = await Message.findById(id).populate('sender', 'fullName image role');
    return message;
  } catch (err) {
    logger.error(err,'from: get a message')
    console.error(err);
    return null;
  }
};
exports.getMessageByChatId = async (id) => {
  try {
    const message = await Message.find({chat: id}).populate('sender', 'fullName image role');
    return message;
  } catch (err) {
    logger.error(err, 'from: get all message')
    console.error(err);
    return null;
  }
};
exports.updateMessageById = async  (id, document, options) =>{
  try {
    const message = await Message.findByIdAndUpdate(id, document, options)
    return message
  } catch (error) {
    logger.error(error, 'from: update-message')
    console.log(error)
  }
}
exports.deleteMessageById = async (id) =>{
  try {
    const message = await Message.findByIdAndDelete(id)
    console.log(message)
    return message
  } catch (error) {
    logger.error(error, 'from: delete-message')
    console.log(error)
  }
}
