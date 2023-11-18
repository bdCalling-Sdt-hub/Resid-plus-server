const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  couponCode: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, required: true },
},
  { timestamps: true },
);

module.exports = mongoose.model('PromoCode', promoCodeSchema);