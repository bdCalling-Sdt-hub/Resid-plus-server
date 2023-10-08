const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  // participants:[{
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref:'User'
  // }],
  participants:[{
    type: String,
  }],
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Chat', chatSchema);