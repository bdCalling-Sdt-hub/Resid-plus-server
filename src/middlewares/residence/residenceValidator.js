const response = require('../../helpers/response');
const unlinkImages = require('../../common/image/unlinkImage');

const validateResidenceMiddleware = (req, res, next) => {
  const {
    residenceName, capacity, beds, baths, address, city,
    municipality, quirtier, hourlyAmount
  } = req.body;

  let errors = {};

  if (!residenceName || (isNaN(capacity) || capacity <= 0) || (isNaN(beds) || beds <= 0) || (isNaN(baths || baths <= 0)) || !address || !city || !municipality || !quirtier || (isNaN(hourlyAmount) || hourlyAmount <= 0)) {
    return res.status(403).json(response({ status: 'Error', statusCode: '403', type: 'residence', message: "Must provide appropiate data" }));
  }
  // if (!residenceName) {
  //   errors.push(req.t('Residence Name must be given'));
  // }

  // if (isNaN(capacity) || capacity <= 0) {
  //   errors.push(req.t('Capacity must be a positive number'));
  // }

  // if (isNaN(beds) || beds <= 0) {
  //   errors.push(req.t('Number of beds must be a positive number'));
  // }

  // if (isNaN(baths) || baths <= 0) {
  //   errors.push(req.t('Number of baths must be a positive number'));
  // }

  // if (!address) {
  //   errors.push(req.t('Address must be provided'));
  // }

  // if (!city) {
  //   errors.push(req.t('City must be provided'));
  // }

  // if (!municipality) {
  //   errors.push(req.t('Municipality must be provided'));
  // }

  // if (!quirtier) {
  //   errors.push(req.t('Quirtier must be provided'));
  // }

  // if (isNaN(hourlyAmount) || hourlyAmount <= 0) {
  //   errors.push(req.t('Hourly amount must be a positive number'));
  // }

  // if (Object.keys(errors).length > 0) {
  //   unlinkImages(req.files.map(file => file.path))
  //   return res.status(403).json(response({ status: 'Error', statusCode: '403', type: 'residence', message: errors }));
  // }

  next();
};

module.exports = validateResidenceMiddleware;
