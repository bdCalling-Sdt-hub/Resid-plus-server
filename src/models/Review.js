const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence' },
    rating: { type: Number, required: true, default:5 },
},
    { timestamps: true },
);

module.exports = mongoose.model('Review', reviewSchema);