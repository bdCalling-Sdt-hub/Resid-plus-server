const response = require('../helpers/response')
const multer = require('multer')
function notFoundHandler(req, res, next){
  next(new Error('Your requested content not found'))
}

function errorHandler(err, req, res, next){
  var type;
  if (err instanceof multer.MulterError) {
    type = 'MulterError';
  }
  console.log('Error Handler--------->', err)
  res.status(500).json(response({ status: 'Error', statusCode: '500', type: type, message: err.message, data: null }));
}
module.exports = {notFoundHandler, errorHandler}