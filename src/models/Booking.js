const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId:{
    type: String,
    required: true,
    unique: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence', required: true },
  numberOfGuests: { type: Number, default: 1, required: false },
  userContactNumber: { type: String, required: false },
  totalHours: { type: Number, required: false },
  totalTime: {
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 }
  },
  totalAmount: { type: Number, default: 1, required: false },
  residenceCharge: { type: Number, default: 1, required: false },
  serviceCharge: { type: Number, default: 1, required: false },
  discount: { type: Number, default: 0, required: false },
  checkInTime: { type: Date, required: true },
  checkOutTime: { type: Date, required: true },
  status: { type: String, enum: ['reserved', 'cancelled', 'pending','check-in','check-out'], default: 'pending' },
  guestTypes: { type: String, enum: ['adults-only', 'including-child','unknown'], default: 'unknown'},
  paymentTypes: { type: String, enum: ['half-payment', 'full-payment', 'unknown'], default: 'unknown' },
  isDeleted: { type: Boolean, default: false },
  isUserHistoryDeleted: { type: Boolean, default: false },
  isHostHistoryDeleted: { type: Boolean, default: false },
},
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Booking', bookingSchema);