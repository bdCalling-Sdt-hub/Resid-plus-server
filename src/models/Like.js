const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  residenceId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Residence',
    required: false
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: false
  },
});

module.exports = mongoose.model('Like', likeSchema);