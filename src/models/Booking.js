const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence', required: true },
  totalPerson: { type: Number, default: 1, required: false },
  userContactNumber: { type: String, required: false },
  totalAmount: { type: Number, default: 1, required: false },
  checkInTime: { type: String, required: true },
  checkOutTime: { type: String, required: true },
  status: { type: String, enum: ['reserved', 'cancelled', 'completed', 'pending'], default: 'pending' },
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Booking', bookingSchema);