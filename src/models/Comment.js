const mongoose = require('mongoose');

const comment = new mongoose.Schema({
  residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence', required: true },
  comment: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
},
  { timestamps: true },
);

module.exports = mongoose.model('Comment', comment);