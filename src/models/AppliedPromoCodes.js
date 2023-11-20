const mongoose = require('mongoose');

const appliedPromoCodeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  promoCode: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode' },
},
  { timestamps: true },
);

module.exports = mongoose.model('AppliedPromoCode', appliedPromoCodeSchema);