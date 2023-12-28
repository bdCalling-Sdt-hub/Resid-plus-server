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

function validateDateOfBirth(dateString) {
  const dob = new Date(dateString);
  const minAge = 18;
  const now = new Date();
  const diff = now - dob;
  const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)); // Approximate age
  return age >= minAge;
}


const validationMiddleware = async (req, res, next) => {
  try {
    const { fullName, email, dateOfBirth, password, role, country } = req.body;

    //let errors = [];
    console.log(req.body);
    if(dateOfBirth!==null || dateOfBirth!==undefined){
      if(!validateDateOfBirth(dateOfBirth)){
        return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: "Must be 18 years old" }));
      }
    }

    if (!fullName || !validateEmail(email) || !validatePassword(password) || !role || !country) {
      return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: "Must provide appropiate data" }));
    }
    // if (!/^\+22[156983]\d{6,10}$/.test(phoneNumber)) {
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
