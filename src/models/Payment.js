const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentData: { type: Object, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
},
    { timestamps: true },
);

module.exports = mongoose.model('Payment', paymentSchema);