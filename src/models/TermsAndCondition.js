const mongoose = require('mongoose');

const termsAndConditionSchema = new mongoose.Schema({
  content: { type: String, required: [true, 'Terms and condition field must be Required'] },
},
  { timestamps: true },
);

module.exports = mongoose.model('TermsAndCondition', termsAndConditionSchema);