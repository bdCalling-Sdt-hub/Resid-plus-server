const mongoose = require('mongoose');

const country = new mongoose.Schema({
  countryName: { type: String, required: true, unique: true },
  countryCode: { type: String, required: true, unique: true },
  countryFlag: { type: Object, required: false }
},
  { timestamps: true },
);

module.exports = mongoose.model('Country', country);