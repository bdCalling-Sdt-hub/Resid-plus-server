const express = require('express');
const {  allPayment, createPayInToken, payInAmount, takePayment, paymentStatus, confirmPayment, getAllPayments  } = require('../controllers/paymentController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add payment
router.post('/get-payment-token', isValidUser,createPayInToken);
router.post('/make-payment', isValidUser,payInAmount);
router.post('/withdraw-payment', isValidUser,takePayment);
router.post('/payment-status',paymentStatus);
router.post('/confirm-payment/wizall',isValidUser,confirmPayment);
router.get('/all',getAllPayments);
router.get('/', isValidUser,allPayment);


module.exports = router;