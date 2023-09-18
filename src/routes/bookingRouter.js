const express = require('express');
const { addBooking, allBooking, updateBooking, bookingDetails } = require('../controllers/bookingContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();


//Add booking
router.post('/',isValidUser, addBooking);
router.get('/', isValidUser, allBooking);
router.put('/:id',isValidUser, updateBooking);
router.get('/:id', isValidUser, bookingDetails);


module.exports = router;