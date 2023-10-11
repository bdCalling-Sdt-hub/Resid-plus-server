const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  content: { type: String, required: [true, 'About us field must be Required'] },
},
  { timestamps: true },
);

module.exports = mongoose.model('Support', supportSchema);