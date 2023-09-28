const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  message: { type: String, required: false },
  image: { type: Object, required: false },
  linkId: { type: String, required: false },
  type: { type: String, enum: ['admin', 'user', 'host', 'unknown', 'conversation'], default: 'unknown' },
  viewStatus: { type: Boolean, enum: [true, false], default: false }
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);