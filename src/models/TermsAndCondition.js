const mongoose = require('mongoose');

const termsAndConditionSchema = new mongoose.Schema({
  content: { type: String, required: true },
},
  { timestamps: true },
);

module.exports = mongoose.model('TermsAndCondition', termsAndConditionSchema);