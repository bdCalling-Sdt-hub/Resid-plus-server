const upload = require('./fileUpload')
const response = require('../helpers/response')
const imageVerification = (req, res, next) => {
  const files = req.files || [];

  if (files.length === 0) {
    res.status(500).json({
      status: 'Error',
      statusCode: '404',
      message: 'Images not found'
    });
  } else {
    next();
  }
};

module.exports = imageVerification;