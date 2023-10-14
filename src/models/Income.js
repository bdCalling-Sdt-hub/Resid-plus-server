const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
    totalIncome: { type: Number, required: false },
    hostTotalPayment: { type: String },
    hostPercentage: { type: Number, required: false },
    hostPendingPercentage: { type: String },
    paymentList: { type: String },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
},
    { timestamps: true },
);

module.exports = mongoose.model('Income', incomeSchema);