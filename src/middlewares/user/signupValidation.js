const User = require('../../models/User');
const response = require('../../helpers/response');

function validateName(name) {
  return /^[A-Z][a-zA-z ]*$/.test(name);
}

function validateEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validatePassword(password) {
  return password.length >= 5;
}

const validationMiddleware = async (req, res, next) => {
  const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

  let errors = [];

  if (!validateName(fullName)) {
    errors.push({ field: 'fullName', error: 'Invalid name format, must start with a capital letter' });
  }

  if (!validateEmail(email)) {
    errors.push({ field: 'email', error: 'Invalid email format' });
  }

  if (!validatePassword(password)) {
    errors.push({ field: 'password', error: 'Password length must be 5 digits' });
  }

  const userExist = await User.findOne({ email });
  if (userExist) {
    errors.push({ field: 'email', error: 'User already exists' });
  }

  if (errors.length > 0) {
    return res.status(400).json(response({ status: 'Error', statusCode: '400',type:"sign-up", message: errors }));
  }

  next(); // Continue to the next middleware or route handler
};

module.exports = validationMiddleware;
