const upload = require('./fileUpload')
const response = require('../helpers/response');
const logger = require('../helpers/logger');
const imageVerification = (req, res, next) => {
  const files = req.files || [];

  if (files.length === 0) {
    logger.error('Images not found', 'image verification middleware');
    return res.status(403).json(response({
      status: 'Error',
      statusCode: '403',
      message: req.t('Images not found')
    }));
  } else {
    next();
  }
};

module.exports = imageVerification;