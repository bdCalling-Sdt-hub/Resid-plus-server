const logger = require("../helpers/logger");
const response = require("../helpers/response");
const PaymentGateway = require("../models/PaymentGateway");
const User = require("../models/User");

const addMultiplePaymentGateway = async (req, res) => {
  var data = await PaymentGateway.insertMany(req.body);
  return res.status(200).json(
    response({
      status: 'OK',
      statusCode: '200',
      type: 'paymentGateway',
      message: req.t('PaymentGateway added successfully'),
      data: data,
    })
  );
}

//All paymentGateways
const allPaymentGateways = async (req, res) => {
  try {
    var data;
    const checkUser = await User.findById(req.body.userId);
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    data = await PaymentGateway.findOne({ country: checkUser.country }).populate('country', 'countryName');
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        message: req.t('PaymentGateway retrieved successfully'),
        data: data,
      })
    );
  }
  catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting paymentGateways'),
      })
    );
  }
};

module.exports = { addMultiplePaymentGateway, allPaymentGateways };