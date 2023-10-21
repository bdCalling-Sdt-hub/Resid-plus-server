const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    parcentage: { type: Number, required: true, default: 15 },
    paidAmount: { type: Number, required: true, default: 0 },
    totalAmount: { type: Number, required: true, default: 0 },
},
    { timestamps: true },
);

module.exports = mongoose.model('Income', incomeSchema);