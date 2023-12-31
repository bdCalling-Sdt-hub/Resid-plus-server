const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  message: { type: String, required: false },
  image: { type: Object, required: false },
  linkId: { type: String, required: false },
  role:{ type: String, enum: ['super-admin', 'user', 'host', 'unknown', 'admin'], default: 'unknown' },
  type: { type: String, enum: ['residence', 'booking','user','unknown'], default: 'unknown' },
  viewStatus: { type: Boolean, enum: [true, false], default: false }
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Notification', notificationSchema);