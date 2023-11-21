const logger = require("../helpers/logger");
const response = require("../helpers/response");
const Income = require("../models/Income");
const User = require("../models/User");

//All incomes
const allIncomes = async (req, res) => {
  try {
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

    const income = await Income.find({ hostId: req.body.userId });
    if (!income) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('Income not found'),
        })
      );
    }
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'income',
        message: req.t('Income retrieved successfully'),
        data: income,
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
        message: req.t('Error getting incomes'),
      })
    );
  }
};

module.exports = { allIncomes };