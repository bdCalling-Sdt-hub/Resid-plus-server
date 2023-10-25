const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: [true, 'Name is must be given'], trim: true },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    unique: [true, 'Email should be unique'],
    lowercase: true,
    validate: {
      validator: function (v) {
        return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v);
      },
      message: 'Please enter a valid Email'
    }
  },
  phoneNumber: { type: String, required: false, trim: true },
  address: { type: String, required: false, trim: true },
  dateOfBirth: { type: String, required: false },
  password: { type: String, required: [true, 'Password must be given'], set: (v) => bcrypt.hashSync(v, bcrypt.genSaltSync(10)) },
  image: {
    type: Object, required: false, default: {
      publicFileUrl: 'http://165.22.118.95:3000/uploads/users/user-1695552693976.jpg',
      path: 'public\\uploads\\users\\user-1695552693976.jpg'
    }
  },
  role: { type: String, enum: ['user', 'admin', 'unknown', 'host'], default: 'unknown' },
  emailVerified: { type: Boolean, default: false },
  //emailVerificationAttemps: { type: Number, default: 0 },
  oneTimeCode: { type: String, required: false },
  //isDeleted: { type: Boolean, default: false },
}, { timestamps: true }, {
  toJSON: {
    transform(doc, ret) {
      delete ret.password;
    },
  },
},

);

module.exports = mongoose.model('User', userSchema);