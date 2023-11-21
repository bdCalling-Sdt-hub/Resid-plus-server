const express = require('express');
const {  allPayment, createPayInToken, payInAmount, takePayment  } = require('../controllers/paymentController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add payment
router.post('/get-payment-token', isValidUser,createPayInToken);
router.post('/make-payment', isValidUser,payInAmount);
router.post('/take-payment', isValidUser,takePayment);
router.get('/', isValidUser,allPayment);



module.exports = router;