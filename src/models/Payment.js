const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentData: { type: Object, required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    paymentTypes: { type: String, enum: ['half-payment', 'full-payment', 'pending'], default: 'pending' },
    token: { type: String, required: true },
    paymentMethod : { type: String, required: false },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
},
    { timestamps: true },
);

module.exports = mongoose.model('Payment', paymentSchema);