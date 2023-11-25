const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  title: { type: String, required: false },
  couponCode: { type: String, required: false },
  discountPercentage: { type: Number, required: false },
  expiryDate: { type: Date, required: false },
  isActive: { type: Boolean, required: false },
},
  { timestamps: true },
);

module.exports = mongoose.model('PromoCode', promoCodeSchema);