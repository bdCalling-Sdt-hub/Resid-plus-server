const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema({
    totalIncome: { type: Number, default: 0, required: false },
    // hostPercentage: { type: Number, default: 0, required: false },
    pendingAmount: { type: Number, default: 0, required: false },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
},
    { timestamps: true },
);

module.exports = mongoose.model('Income', incomeSchema);