const express = require('express');
const { addBooking, allBooking, updateBooking, bookingDetails } = require('../controllers/bookingContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();
const { payment } = require('../controllers/paymentController');

// Sign-up
router.post('/:requestId', isValidUser, payment);

module.exports = router;


//Add booking
router.post('/',isValidUser, addBooking);
router.get('/', isValidUser, allBooking);
router.put('/:id',isValidUser, updateBooking);
router.get('/:id', isValidUser, bookingDetails);


module.exports = router;