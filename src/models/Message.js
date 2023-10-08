const mongoose = require('mongoose')
const messageModel = mongoose.Schema(
  {
    message: {
      type: String,
      trim: true
    },
    chat:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'Chat'
    },
    sender:{
      type: mongoose.Schema.Types.ObjectId,
      ref:'User'
    },
  },{
    timestamps: true
  }
);
module.exports = mongoose.model('Message', messageModel);