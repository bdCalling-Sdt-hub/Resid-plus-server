const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentData: { type: Object, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['accepted', 'rejected', 'pending', 'cancelled'],default: 'pending' },
},
    { timestamps: true },
);

module.exports = mongoose.model('Payment', paymentSchema);