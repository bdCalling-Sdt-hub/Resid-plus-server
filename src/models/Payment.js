const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    paymentData: { type: Object },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence' },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
    status:{type:String, required:false},

},
    { timestamps: true },
);

module.exports = mongoose.model('Payment', paymentSchema);