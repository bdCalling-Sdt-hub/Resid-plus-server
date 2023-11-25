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

    let errors = {};
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: "User already exists" }));
    }

    if (!fullName) {
      errors.fullName = req.t('Full name must be given');
    }
    else {
      errors.fullName = {}
    }
    if (!phoneNumber) {
      errors.phoneNumber = req.t('Phone number must be given');
    }
    else {
      errors.phoneNumber = {}
    }

    if (!validateEmail(email)) {
      errors.email = req.t('Email is invalid');
    }
    else {
      errors.email = {}
    }

    if (!address) {
      errors.address = req.t('Address must be given');
    }
    else {
      errors.address = {}
    }

    if (!validateDate(dateOfBirth)) {
      errors.dateOfBirth = req.t('Date of birth is invalid');
    }
    else {
      errors.dateOfBirth = {}
    }

    if (!validatePassword(password)) {
      errors.password = req.t('Password is invalid');
    }
    else {
      errors.password = {}
    }


    if (!role) {
      errors.role = req.t('Role must be given');
    }
    else {
      errors.role = {}
    }
    
    if (Object.keys(errors).length !== 0) {
      logger.error('Sign up validation error', 'sign-up middleware');
      return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: errors }));
    }

    next(); // Continue to the next middleware or route handler
  }
  catch (error) {
    logger.error(error, 'sign-up middleware');
    console.error(error);
  }
};

module.exports = validationMiddleware;
