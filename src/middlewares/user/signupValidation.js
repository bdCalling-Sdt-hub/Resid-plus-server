const User = require('../../models/User')

function validateName(name) {
  console.log(name)
  return /^[A-Z][a-zA-z ]*$/.test(name);
}

function validateEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validatePassword(password) {
  return password.length >= 5;
}

const validationMiddleware= async (req, res, next)=> {
  // console.log(req.body)

  const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

  console.log(email, password, fullName)
  if (!validateName(fullName)) {
    return res.status(400).json({ error: "Invalid name format" });
  }
  
  if (!validateEmail(email)) {

    return res.status(400).json({ error: "Invalid email format" });
  }

  if (!validatePassword(password)) {
    return res.status(400).json({ error: "Invalid password format" });
  }
  const userExist = User.findOne({ email });
  if (userExist) {
    return res.status(409).json({ statusCode: 200, message: 'Hewlloisfoshfi', status: "OK" });
  }
  next(); // Continue to the next middleware or route handler
}

module.exports = validationMiddleware;
