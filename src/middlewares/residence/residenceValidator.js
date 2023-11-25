const response = require('../../helpers/response');
const unlinkImages = require('../../common/image/unlinkImage');

const validateResidenceMiddleware = (req, res, next) => {
  const {
    residenceName, capacity, beds, baths, address, city,
    municipality, quirtier, hourlyAmount
  } = req.body;

  let errors = {};

  if (!residenceName) {
    errors.residenceName = req.t('Residence Name must be given');
  }
  else{
    errors.residenceName = {}
  }

  if (isNaN(capacity) || capacity <= 0) {
    errors.capacity = req.t('Capacity must be a positive number');
  }
  else{
    errors.capacity = {}
  }

  if (isNaN(beds) || beds <= 0) {
    errors.beds = req.t('Number of beds must be a positive number');
  }
  else{
    errors.beds = {}
  }

  if (isNaN(baths) || baths <= 0) {
    errors.baths = req.t('Number of baths must be a positive number');
  }
  else{
    errors.baths = {}
  }

  if (!address) {
    errors.address = req.t('Address must be provided');
  }
  else{
    errors.address = {}
  }

  if (!city) {
    errors.city = req.t('City must be provided');
  }
  else{
    errors.city = {}
  }

  if (!municipality) {
    errors.municipality = req.t('Municipality must be provided');
  }
  else{
    errors.municipality = {}
  }

  if (!quirtier) {
    errors.quirtier = req.t('Quirtier must be provided');
  }
  else{
    errors.quirtier = {}
  }

  if (isNaN(hourlyAmount) || hourlyAmount <= 0) {
    errors.hourlyAmount = req.t('Hourly amount must be a positive number');
  }
  else{
    errors.hourlyAmount = {}
  }

  if (Object.keys(errors).length > 0) {
    unlinkImages(req.files.map(file => file.path))
    return res.status(403).json(response({ status: 'Error', statusCode: '403', type: 'residence', message: errors }));
  }

  next();
};

module.exports = validateResidenceMiddleware;
