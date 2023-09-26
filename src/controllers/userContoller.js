const User = require("../models/User");
const bcrypt = require('bcryptjs');
const response = require("../helpers/response");
const jwt = require('jsonwebtoken');
const fs = require("fs");
const emailWithNodemailer = require("../helpers/email");
require('dotenv').config();
//defining unlinking image function 
const unlinkImages = require('../common/image/unlinkImage')

//Sign up
const signUp = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

    // Check if the user already exists
    const userExist = await User.findOne({ email });
    if (userExist) {
      //providing the image path saved in the server
      unlinkImages(req.file.path)
      return res.status(409).json(response({ statusCode: 200, message: 'User already exists', status: "OK" }));
    }

    // Create the user in the database
    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      address,
      dateOfBirth,
      password,
      role,
      image: req.file
    });

    res.status(201).json(response({
      status: "Created",
      message: "User created successfully",
      statusCode: 201,
      type: "user",
      data: user,
    }));

  } catch (error) {
    //providing the image path saved in the server
    unlinkImages(req.file.path)
    console.error(error);
    res.status(500).json({ message: 'Error creating user', error });
  }
};

//Sign in
const signIn = async (req, res) => {
  try {
    //Get email password from req.body
    const { email, password } = req.body;
    console.log(email);

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json(response({ statusCode: 200, message: 'User not found', status: "OK" }));
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json(response({ statusCode: 200, message: 'Invalid password', status: "OK" }));
    }

    //Checking banned user
    if (user.isBanned) {
      return res.status(403).json(response({ statusCode: 200, message: 'User is banned', status: "OK" }));
    }

    //Token, set the Cokkie
    const accessToken = jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '12h' });

    //Success response
    res.status(200).json(response({ statusCode: 200, message: 'User logged in successfully', status: "OK", type: "user", data: user, token: accessToken }));
  } catch (error) {
    console.error(error);
    res.status(500).json(response({ statusCode: 200, message: 'Error logging in user', status: "OK", error }));
  }
};

//Process forgot password
const processForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user already exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json(response({ statusCode: 200, message: 'User does not exist', status: "OK" }));
    }

    // Generate OTC (One-Time Code)
    const oneTimeCode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

    // Store the OTC and its expiration time in the database
    user.oneTimeCode = oneTimeCode;
    await user.save();

    // Prepare email for password reset
    const emailData = {
      email,
      subject: 'Password Reset Email',
      html: `
        <h1>Hello, ${user.fullName}</h1>
        <p>Your One Time Code is <h3>${oneTimeCode}</h3> to reset your password</p>
        <small>This Code is valid for 3 minutes</small>
      `
    }

    // Send email
    try {
      await emailWithNodemailer(emailData);
    } catch (emailError) {
      console.error('Failed to send verification email', emailError);
    }

    // Set a timeout to update the oneTimeCode to null after 1 minute
    setTimeout(async () => {
      try {
        user.oneTimeCode = null;
        await user.save();
        console.log('oneTimeCode reset to null after 3 minute');
      } catch (error) {
        console.error('Error updating oneTimeCode:', error);
      }
    }, 180000); // 3 minute in milliseconds

    res.status(201).json(response({ message: 'Thanks! Please check your email to reset password', status: "OK", statusCode: 200 }));
  } catch (error) {
    res.status(500).json(response({ message: 'Error processing forget password', statusCode: 200, status: "OK" }));
  }
};

//Verify the oneTimeCode
const verifyOneTimeCode = async (req, res) => {
  try {
    const { oneTimeCode, email } = req.body;
    console.log(req.body.oneTimeCode);
    console.log(email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(40).json(response({ message: 'User does not exist', status: "OK", statusCode: 200 }));
    } else if (user.oneTimeCode === oneTimeCode) {
      res.status(200).json(response({ message: 'Verified', status: "OK", statusCode: 200 }));
      user.oneTimeCode = 'verified';
      await user.save();
    } else {
      res.status(400).json(response({ message: 'Invalid OTC', status: "OK", statusCode: 200 }));
    }
  } catch (error) {
    res.status(500).json(response({ message: 'Error verifying OTC', status: "OK", statusCode: 200 }));
  }
};

//Update password without login
const updatePassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body.password);
    console.log(email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json(response({ message: 'User does not exist', status: "OK", statusCode: 200 }));
    } else if (user.oneTimeCode === 'verified'){
      user.password = password;
      await user.save();
      res.status(200).json(response({ message: 'Password updated successfully', status: "OK", statusCode: 200 }));
    }
  } catch (error) {
    res.status(500).json(response({ message: 'Error updating password', status: "OK", statusCode: 200 }));
  }
};



module.exports = { signUp, signIn, processForgetPassword, verifyOneTimeCode, updatePassword }