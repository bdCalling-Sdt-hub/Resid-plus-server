const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  message: { type: String, required: false },
  image: { type: Object, required: false },
  linkId: { type: String, required: false },
  type: { type: String, enum: ['admin', 'user', 'host', 'unknown'], default: 'unknown' },
  viewStatus: { type: Boolean, enum: [true, false], default: false }
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);