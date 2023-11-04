const response = require('../../helpers/response');
const unlinkImages = require('../../common/image/unlinkImage');
const validateResidenceMiddleware = (req, res, next) => {
  const {
    residenceName, capacity, beds, baths, address, city,
    municipality, quirtier, hourlyAmount, category
  } = req.body;

  let errors = [];

  if (!residenceName) {
    errors.push({ field: 'residenceName', error: req.t('Residence Name must be given') });
  }

  if (isNaN(capacity) || capacity <= 0) {
    errors.push({ field: 'capacity', error: req.t('Capacity must be a positive number') });
  }

  if (isNaN(beds) || beds <= 0) {
    errors.push({ field: 'beds', error: req.t('Number of beds must be a positive number') });
  }

  if (isNaN(baths) || baths <= 0) {
    errors.push({ field: 'baths', error: req.t('Number of baths must be a positive number') });
  }

  if (!address) {
    errors.push({ field: 'address', error: req.t('Address must be provided') });
  }

  if (!city) {
    errors.push({ field: 'city', error: req.t('City must be provided') });
  }

  if (!municipality) {
    errors.push({ field: 'municipality', error: req.t('Municipality must be provided') });
  }

  if (!quirtier) {
    errors.push({ field: 'quirtier', error: req.t('Quirtier must be provided') });
  }

  if (isNaN(hourlyAmount) || hourlyAmount <= 0) {
    errors.push({ field: 'hourlyAmount', error: req.t('Hourly amount must be a positive number') });
  }

  const validCategories = ['hotel', 'residence', 'personal-house'];
  if (!validCategories.includes(category)) {
    errors.push({ field: 'category', error: req.t('Invalid category') });
  }

  // Check if amenities is defined and is an array
  // if (!Array.isArray(amenities)) {
  //   console.log(amenities);
  //   errors.push({ field: 'amenities', error: req.t('Amenities must be an array') });
  // } else {
  //   const validAmenities = [
  //     "wifi", "air-conditioner", "heating", "parking", "pets",
  //     "kitchen", "tv", "internet", "washing-machine", "dryer", "refrigerator",
  //     "air-conditioner", "heating", "parking"
  //   ];
  //   console.log(amenities);
  //   for (var amenity of amenities) {
  //     if (!validAmenities.includes(amenity)) {
  //       errors.push({ field: 'amenities', error: req.t('Invalid amenities') });
  //       break;
  //     }
  //   }
  // }

  if (errors.length > 0) {
    unlinkImages(req.files.map(file => file.path))
    return res.status(403).json(response({ status: 'Error', statusCode: '403', type: 'residence', message: errors }));
  }

  next();
};

module.exports = validateResidenceMiddleware;
