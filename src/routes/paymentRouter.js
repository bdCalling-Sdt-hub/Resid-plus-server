const express = require('express');
const {  allPayment, createPayInToken, payInAmount, takePayment, paymentStatus  } = require('../controllers/paymentController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add payment
router.post('/get-payment-token', isValidUser,createPayInToken);
router.post('/make-payment', isValidUser,payInAmount);
router.post('/withdraw-payment', isValidUser,takePayment);
router.post('/payment-status',paymentStatus);
router.get('/payment-status',paymentStatus);
router.get('/', isValidUser,allPayment);

module.exports = router;