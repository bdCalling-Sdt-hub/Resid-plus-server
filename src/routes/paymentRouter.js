const express = require('express');
const {  addPayment, allPayment, refund  } = require('../controllers/paymentController');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add payment
router.post('/', isValidUser,addPayment);
router.get('/', isValidUser,allPayment);
router.get('/refund', refund);


module.exports = router;