const mongoose = require('mongoose');

const paymentGateway = new mongoose.Schema({
  country: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Country',
    required: false
  },
  paymentGateways: [{
    method: { type: String, required: false, enum:["ORANGE", "MTN","MOOV","WAVE","EXPRESSO","WIZALL","FREE-MONEY","T-MONEY"] },
    paymentTypes: { type: String, required: false },
    publicFileUrl: { type: String, required: false },
  }],
},
  { timestamps: true },
);

module.exports = mongoose.model('PaymentGateway', paymentGateway);