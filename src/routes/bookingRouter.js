const express = require('express');
const { addBooking, allBooking, updateBooking, bookingDetails, bookingDashboardRatio, deleteBooking,calculateTimeAndPrice, deleteHistory, cancelBookingByUser, refundPolicy } = require('../controllers/bookingContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();


//Add booking
router.post('/',isValidUser, addBooking);
router.post('/calculate-time-and-amount', isValidUser, calculateTimeAndPrice)
router.get('/:id', isValidUser, bookingDetails);
router.get('/refund-policy/:id', isValidUser, refundPolicy);
router.get('/', isValidUser, allBooking);
router.put('/cancel-booking-by-user/:id',isValidUser, cancelBookingByUser);
router.put('/:id',isValidUser, updateBooking);
router.get('/dashboard/ratio', isValidUser, bookingDashboardRatio);
router.delete('/:id', isValidUser, deleteBooking);
router.delete('/history/:id', isValidUser, deleteHistory);


module.exports = router;