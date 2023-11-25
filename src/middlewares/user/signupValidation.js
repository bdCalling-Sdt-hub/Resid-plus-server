const User = require('../../models/User');
const response = require('../../helpers/response');
const logger = require('../../helpers/logger');

function validateEmail(email) {
  return /^[a-zA-ZÀ-ÖØ-öø-ÿ0-9._%+-]+@[a-zA-ZÀ-ÖØ-öø-ÿ0-9.-]+\.[a-zA-ZÀ-ÖØ-öø-ÿ]{2,}$/.test(email);
}

function validatePassword(password) {
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= 8 && hasNumber && (hasLetter || hasSpecialChar);
}

function validateDate(dateString) {
  var date = new Date(dateString);
  return !isNaN(date.getTime());
}

const validationMiddleware = async (req, res, next) => {
  try {
    const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

    let errors = [];

    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: "User already exists" }));
    }

    if (!fullName || !/^\+225\d{6,10}$/.test(phoneNumber) || !validateEmail(email) || !address || !validateDate(dateOfBirth) || !validatePassword(password) || !role) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: "Must provide appropiate data" }));
    }
    // if (!/^\+225\d{6,10}$/.test(phoneNumber)) {
    //   errors.push(req.t('Invalid phone number format'));
    // }
    // if (!validateEmail(email)) {
    //   errors.push(req.t('Invalid email format'));
    // }
    // if (!address) {
    //   errors.push(req.t('Address must be given'));
    // }
    // if (!validateDate(dateOfBirth)) {
    //   errors.push(req.t('Date of birth must be given'));
    // }
    // if (!validatePassword(password)) {
    //   errors.push(req.t('Password length must be 8 and must contain at least 1 alphaber or special character'));
    // }
    
    // if (!role) {
    //   errors.push(req.t('Role must be given'));
    // }
    // if (Object.keys(errors).length !== 0) {
    //   logger.error('Sign up validation error', 'sign-up middleware');
    //   return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: errors }));
    // }
    next(); // Continue to the next middleware or route handler
  }
  catch (error) {
    logger.error(error, 'sign-up middleware');
    console.error(error);
  }
};


module.exports = validationMiddleware;
