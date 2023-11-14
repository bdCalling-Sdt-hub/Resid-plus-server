const express = require('express');
const {  allPayment, createPayInToken, payInAmount  } = require('../controllers/paymentController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add payment
router.post('/get-payment-token', isValidUser,createPayInToken);
router.post('/make-payment', isValidUser,payInAmount);
router.get('/', isValidUser,allPayment);



module.exports = router;