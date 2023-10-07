const mongoose = require("mongoose");
const Message = require('../models/Message');

exports.addMessage = async (messageInfo) => {
  console.log('------------add message hitted----------')
  try {
    const newMessage = new Message(messageInfo);
    await newMessage.save();
    return newMessage;
  } catch (err) {
    console.error(err);
    return null;
  }
};
exports.getById = async (id) => {
  try {
    const message = await Message.findById(id);
    console.log(id, message)
    return message;
  } catch (err) {
    console.error(err);
    return null;
  }
};
exports.getMessageByChatId = async (id) => {
  try {
    const message = await Message.find({chat: id}).populate('sender');
    console.log(id, message)
    return message;
  } catch (err) {
    console.error(err);
    return null;
  }
};
exports.updateMessageById = async  (id, document, options) =>{
  try {
    const message = await Message.findByIdAndUpdate(id, document, options)
    return message
  } catch (error) {
    console.log(error)
  }
}
exports.deleteMessageById = async (id) =>{
  try {
    const message = await Message.findByIdAndDelete(id)
    console.log(message)
    return message
  } catch (error) {
    console.log(error)
  }
}
