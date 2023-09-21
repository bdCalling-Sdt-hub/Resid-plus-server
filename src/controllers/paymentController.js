const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Residence = require('../models/Residence');
const Booking = require('../models/Booking');
const User = require('../models/User');


const payment = async (req, res) => {
  try {
    const { product, token } = req.body;
    const { requestId } = req.params;

    const user = await User.findById(req.body.userId)
    if (!user) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };

    const bookingRequest = await Booking.findById(requestId);
    if (!bookingRequest) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'Booking request not found' }));
    }

    if (req.body.userId !== bookingRequest.userId.toString() && bookingRequest.requestStatus !== "reserved") {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'You are not authorised to make payment for this request' }));
    }

    const customer = await stripe.customers.create({
      email: token.email,
      source: token.id,
    });

    const paymentData = await stripe.charges.create({
      amount: product.price * 100,
      currency: 'usd',
      customer: customer.id,
      receipt_email: token.email,
      description: `Residence Name: ${product.name}`,
      shipping: {
        name: "John Doe", // Replace with actual name
        address: {
          country: "US", // Replace with actual country code
        },
      },
    });

    // Save payment data to the MongoDB collection 'paymentData'
    const createdPayment = await Payment.create({
      paymentData,
      userId: user._id,
      residenceId: bookingRequest.residenceId,
      booBookingId: bookingRequest,
      hostId: bookingRequest.hostId,
    });

    // Update the Residence model with the paymentId
    const residenceToUpdate = await Residence.findById(bookingRequest.residenceId);
    residenceToUpdate.paymentId = createdPayment._id; // Store the payment ID
    await residenceToUpdate.save();

    bookingRequest.payment = 'Completed';
    await bookingRequest.save();

    res.status(200).json({ message: 'Payment success', paymentData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while processing the payment.', error: error.message });
  }
};



module.exports = { payment };