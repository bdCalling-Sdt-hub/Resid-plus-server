const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  image: { type: Object, required: false },
  title: { type: String, required: false },
  role: [{ type: String, enum: ["user", "host"] }], // Array of strings containing "user" and "host"
  expiaryDate: { type: Date, required: false },
},
{ timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
