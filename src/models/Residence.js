const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  residenceName: { type: String, required: true },
  photo: { type: Object, required: false },
  capacity: { type: Number, required: [true, 'Capacity is must be given'] },
  beds: { type: Number, required: false },
  baths: { type: Number, required: false },
  address: { type: String, required: false },
  city: { type: String, required: false },
  municipality: { type: String, required: false },
  quirtier: { type: String, reqiured: false },
  aboutResidence: { type: String, reqiured: false },
  hourlyAmount: { type: Number, reqiured: false },
  popularity: { type: Number, default:0 },
  ratings: { type: Number, default:0 },
  dailyAmount: { type: Number, reqiured: false },
  amenities: {
    type: Array,
    required: false,
    validate: {
      validator: function (values) {
        return values.every(value => amenities.includes(value));
      },
      message: 'Invalid amenities.',
    },
  },
  ownerName: { type: String, required: false },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  aboutOwner: { type: String, required: false },
  status: { type: String, enum: ['reserved', 'active', 'inactive'], default: 'active' },
  category:{ type: String, enum: ['hotel','residence', 'personal-house'], default: 'residence', required:false }
}, { timestamps: true });

const amenities = [
  "wifi", "air-conditioner", "heating", "parking", "pets",
  "kitchen", "tv", "internet", "washing-machine", "dryer", "refrigerator",
  "air-conditioner", "heating", "parking"
];

module.exports = mongoose.model('Residence', userSchema);