const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  content: { type: String, required: true },
},
  { timestamps: true },
);

module.exports = mongoose.model('Support', supportSchema);