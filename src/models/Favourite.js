const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  residenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Residence', required: true },
});

module.exports = mongoose.model('Favourite', favouriteSchema);