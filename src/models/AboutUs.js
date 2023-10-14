const mongoose = require('mongoose');

const aboutUsSchema = new mongoose.Schema({
  content: { type: String, required: true },
},
  { timestamps: true },
);

module.exports = mongoose.model('AboutUs', aboutUsSchema);