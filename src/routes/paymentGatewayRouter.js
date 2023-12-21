const express = require('express');
const { addMultiplePaymentGateway,allPaymentGateways } = require('../controllers/paymentGatewayContoller');
const { isValidUser } = require('../middlewares/auth');
const router = express.Router();

//Add residence
router.post('/',addMultiplePaymentGateway);
router.get('/', isValidUser, allPaymentGateways);

module.exports = router;