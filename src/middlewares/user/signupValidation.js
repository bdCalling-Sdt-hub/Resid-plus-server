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
  const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

  let errors = [];

  if (!fullName) {
    errors.push({ field: 'fullName', error: 'Full name must be given' });
  }
  if (!/^\+225\d{6,10}$/.test(phoneNumber)) {
    errors.push({ field: 'phoneNumber', error: 'Invalid phone number format' });
  }

  if (!validateEmail(email)) {
    errors.push({ field: 'email', error: 'Invalid email format' });
  }
  if (!address) {
    errors.push({ field: 'address', error: 'Address must be given' });
  }
  if (!validateDate(dateOfBirth)) {
    errors.push({ field: 'dateOfBirth', error: 'Date of birth must be given' });
  }
  if (!validatePassword(password)) {
    errors.push({ field: 'password', error: 'Password length must be 8 and must contain at least 1 alphaber or special character' });
  }
  const userExist = await User.findOne({ email });
  if (userExist) {
    errors.push({ field: 'email', error: 'User already exists' });
  }
  if (!role) {
    errors.push({ field: 'role', error: 'Role must be given' });
  }
  if (errors.length > 0) {
    logger.error("sign up validation error in middleware")
    return res.status(400).json(response({ status: 'Error', statusCode: '400', type: "sign-up", message: errors }));
  }

  next(); // Continue to the next middleware or route handler
};

module.exports = validationMiddleware;
