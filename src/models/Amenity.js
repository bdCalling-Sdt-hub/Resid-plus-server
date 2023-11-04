const mongoose = require('mongoose');

const amenity = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  translation: { 
    en: { type: String, required: true },
    fr: { type: String, required: true }
  },
},
  { timestamps: true },
);

module.exports = mongoose.model('Amenity', amenity);