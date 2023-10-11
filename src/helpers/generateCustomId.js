// customIDGenerator.js
const Booking = require('../models/Booking')
async function generateCustomID() {
  try {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');

    let randomDigits = '';

    const number = await Booking.findOne().select('bookingId').sort({ createdAt: -1 });
    if (number && number.bookingId) {
      const lastNumber = parseInt(number.bookingId.split('-')[2]);
      const newNumber = (lastNumber + 1).toString().padStart(5, '0');
      randomDigits = newNumber;
    } else {
      randomDigits = '00001';
    }
    const customID = `RB-${month}${year}-${randomDigits}`;
    return customID;
  }
  catch (err) {
    console.log(err)
  }
}

module.exports = generateCustomID;
