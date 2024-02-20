const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  image: { type: Object, required: false },
  title: { type: String, required: false },
  role: { type: [String], enum:["user", "host"],required: false },
  expiaryDate: { type: Date, required: false },
},
  { timestamps: true },
);

module.exports = mongoose.model('Event', eventSchema);