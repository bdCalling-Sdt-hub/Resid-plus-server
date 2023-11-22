const User = require("../models/User");
require('dotenv').config();
const crypto = require('crypto');
const Booking = require("../models/Booking")
const bcrypt = require('bcryptjs');
const response = require("../helpers/response");
const jwt = require('jsonwebtoken');
const fs = require("fs");
const emailWithNodemailer = require("../helpers/email");
require('dotenv').config();
//defining unlinking image function 
const unlinkImages = require('../common/image/unlinkImage')
const Activity = require('../models/Activity');
const { addNotification, getAllNotification } = require("./notificationController");
const logger = require("../helpers/logger");
const Residence = require("../models/Residence");
const options = { new: true };

function validatePassword(password) {
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  return password.length >= 8 && hasNumber && (hasLetter || hasSpecialChar);
}

//Sign up
const signUp = async (req, res) => {
  console.log(req.body)
  try {
    const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

    //role as admin is not allowed to be signed-up
    // if(role==='super-admin'){
    //   return res.status(409).json(response({ statusCode: 200, message:req.t('You are not authorized to sign-up'), status: "OK" }));
    // }
    const oneTimeCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

    // Create the user in the database
    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      address,
      dateOfBirth,
      oneTimeCode,
      password,
      role
    });

    if (user && (user.role === 'user' || user.role === 'host')) {
      const emailData = {
        email,
        subject: 'User verification code',
        html: `
          <h1>Hello, ${user.fullName}</h1>
          <p>Your One Time Code is <h3>${oneTimeCode}</h3> to verify your account</p>
          <small>This Code is valid for 3 minutes</small>
        `
      }
      // console.log('email send to verify-------->', emailData)
      // Send email
      try {
        await emailWithNodemailer(emailData);
      } catch (emailError) {
        console.error('Failed to send verification email', emailError);
        logger.error('Failed to send verification email', emailError)
      }
      setTimeout(async () => {
        try {
          user.oneTimeCode = null;
          await user.save();
          console.log('oneTimeCode reset to null after 3 minute');
        } catch (error) {
          console.error('Error updating oneTimeCode:', error);
          logger.error('Error updating oneTimeCode:', error)
        }
      }, 180000); // 3 minute in milliseconds
    }

    res.status(201).json(response({
      status: "Created",
      message: req.t("User created successfully and a verification code just sent to the email"),
      statusCode: 201,
      type: "user",
      data: user,
    }));

  } catch (error) {
    console.error(error);
    logger.error(error, req.originalUrl)
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'user', message: req.t('Error creating user') }));
  }
};

const createUser = async (req, res) => {
  const checkUser = await User.findById(req.body.userId);
  if (checkUser.role !== 'super-admin') {
    return res.status(401).json(response({ statusCode: 200, message: req.t('You are not authorized to create user'), status: "OK" }));
  }
  const { fullName, email, phoneNumber, address, dateOfBirth, role } = req.body;
  const existingUser = await User.findOne({ email });
  if(existingUser){
    return res.status(409).json(response({ statusCode: 200, message: req.t('User already exists'), status: "OK" }));
  }
  const length = 8;
  // Generate a random password
  const password = crypto.randomBytes(length).toString('hex').slice(0, length);
  console.log('password------>',password)
  const user = await User.create({
    fullName,
    email,
    phoneNumber,
    address,
    emailVerified: true,
    dateOfBirth,
    password,
    role
  });

  const url = process.env.ALLOWED_CLIENT_URL_DASHBOARD

  const emailData = {
    email,
    subject: 'User login credentials',
    html: `
        <h3>Welcome ${user.fullName} to Resid+ as ${user.role}</h3>
        <p><b>Your login credentials:</b></p>
        <hr>
        <table>
          <tr>
            <th align="left">Email:</th>
            <td>${user.email}</td>
          </tr>
          <tr>
            <th align="left">Password:</th>
            <td>${password}</td>
          </tr>
        </table>
        <p>To login, <a href=${url}>Click here</a></p>
        `
  }
  // console.log('email send to verify-------->', emailData)
  // Send email
  try {
    await emailWithNodemailer(emailData);
  } catch (emailError) {
    console.error('Failed to send verification email', emailError);
    logger.error('Failed to send verification email', emailError)
  }

  res.status(201).json(response({
    status: "Created",
    message: req.t("User created successfully and a verification code just sent to the email"),
    statusCode: 201,
    type: "user",
    data: user,
  }));
}

//Sign in
const signIn = async (req, res) => {
  try {
    //Get email password from req.body
    const { email, password } = req.body;
    console.log(email);

    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json(response({ statusCode: 200, message: req.t('User does not exists'), status: "OK" }));
    }
    if (user.status !== 'accepted') {
      if (user && user.status === 'banned') {
        return res.status(401).json(response({ statusCode: 200, message: 'Your account is banned', status: "OK" }));
      }
      if (user && user.status === 'suspended') {
        return res.status(401).json(response({ statusCode: 200, message: 'Your account is suspended', status: "OK" }));
      }
    }

    // Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json(response({ statusCode: 200, message: req.t('Invalid password'), status: "OK" }));
    }

    let activityId = null
    if (user.role === 'super-admin') {
      function extractDeviceModel(userAgent) {
        const regex = /\(([^)]+)\)/;
        const matches = userAgent.match(regex);

        if (matches && matches.length >= 2) {
          return matches[1];
        } else {
          return 'Unknown';
        }
      }

      const userA = req.headers['user-agent'];

      const deviceModel = extractDeviceModel(userA);


      function getBrowserInfo(userAgent) {
        const ua = userAgent.toLowerCase();

        if (ua.includes('firefox')) {
          return 'Firefox';
        } else if (ua.includes('edg')) {
          return 'Edge';
        } else if (ua.includes('safari') && !ua.includes('chrome')) {
          return 'Safari';
        } else if (ua.includes('opr') || ua.includes('opera')) {
          return 'Opera';
        } else if (ua.includes('chrome')) {
          return 'Chrome';
        } else {
          return 'Unknown';
        }
      }
      // const deviceNameOrModel = req.headers['user-agent'];
      const userAgent = req.get('user-agent');
      const browser = getBrowserInfo(userAgent);
      const activity = await Activity.create({
        operatingSystem: deviceModel,
        browser,
        userId: user._id
      });
      console.log(activity)
      activityId = activity._id
    }

    //Token, set the Cokkie
    const accessToken = jwt.sign({ _id: user._id, email: user.email, role: user.role, activityId: activityId }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '12h' });

    //Success response
    res.status(200).json(response({ statusCode: 200, message: req.t('User logged in successfully'), status: "OK", type: "user", data: user, token: accessToken }));
  } catch (error) {
    console.error(error);
    logger.error(error, req.originalUrl)
    res.status(500).json(response({ statusCode: 200, message: req.t('Error logging in user'), status: "OK", error }));
  }
};

//Process forgot password
const processForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the user already exists
    const user = await User.findOne({ email });
    if (!user || user.status !== 'accepted') {
      return res.status(400).json(response({ statusCode: 200, message: req.t('User does not exists'), status: "OK" }));
    }

    // Generate OTC (One-Time Code)
    const oneTimeCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

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
      logger.error('Failed to send verification email', emailError)
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

    res.status(201).json(response({ message: req.t('resetpassword'), status: "OK", statusCode: 200 }));
  } catch (error) {
    logger.error(error, req.originalUrl);
    res.status(500).json(response({ message: req.t('Error processing forget password'), statusCode: 200, status: "OK" }));
  }
};

const resendOneTimeCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.status !== 'accepted') {
      return res.status(400).json(response({ statusCode: 200, message: req.t('User does not exist'), status: "OK" }));
    }
    const requestType = !req.query.requestType ? 'resetPassword' : req.query.requestType;
    const oneTimeCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    const subject = requestType === 'resetPassword' ? 'Password Reset Email' : 'User verification code';
    const topic = requestType === 'resetPassword' ? 'resetpassword' : 'verifyaccount';
    // Store the OTC and its expiration time in the database
    user.oneTimeCode = oneTimeCode;
    await user.save();

    // Prepare email for password reset
    const emailData = {
      email,
      subject: subject,
      html: `
        <h1>Hello, ${user.fullName}</h1>
        <p>Your One Time Code is <h3>${oneTimeCode}</h3> to ${topic}</p>
        <small>This Code is valid for 3 minutes</small>
      `
    }
    // Send email
    try {
      await emailWithNodemailer(emailData);
    } catch (emailError) {
      logger.error('Failed to send verification email', emailError)
      console.error('Failed to send verification email', emailError);
    }
    console.log(requestType, subject, topic, oneTimeCode)
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

    res.status(201).json(response({ message: req.t(`${topic}`), status: "OK", statusCode: 200 }));
  } catch (error) {
    logger.error(error, req.originalUrl);
    res.status(500).json(response({ message: req.t(`${topic}error`), statusCode: 200, status: "OK" }));
  }
}

//Verify the oneTimeCode
const verifyOneTimeCode = async (req, res) => {
  try {
    const requestType = !req.query.requestType ? 'resetPassword' : req.query.requestType;
    const { oneTimeCode, email } = req.body;
    console.log(req.body.oneTimeCode);
    console.log(email);
    const user = await User.findOne({ email });
    const currentTime = new Date();
    if (!user || user.status !== 'accepted') {
      return res.status(40).json(response({ message: req.t('User does not exist'), status: "OK", statusCode: 200 }));
    }
    // else if(user.emailVerificationAttemps >= 3){

    // }
    else if (user.oneTimeCode === oneTimeCode) {
      if (requestType === 'resetPassword') {
        user.oneTimeCode = 'verified';
        await user.save();
        res.status(200).json(response({ message: req.t('One Time Code verified successfully'), type: "reset-forget password", status: "OK", statusCode: 200, data: user }));
      }
      else if (requestType === 'verifyEmail' && user.oneTimeCode !== null && user.emailVerified === false) {
        //console.log('email verify---------------->', user)
        user.emailVerified = true;
        user.oneTimeCode = null;
        await user.save();
        const adminMessage = user.fullName + ' has registered to be a ' + user.role + ' in your system'
        const newNotification = {
          message: adminMessage,
          image: user.image,
          linkId: user._id,
          type: 'user',
          role: 'super-admin'
        }
        console.log('add noitification called--->')
        await addNotification(newNotification)
        const notification = await getAllNotification('super-admin', 10, 1)
        io.emit('super-admin-notification', notification);
        console.log('email verify---------------->', user)
        res.status(200).json(response({ message: req.t('Email verified successfully'), status: "OK", type: "email verification", statusCode: 200, data: user }));
      }
      else {
        res.status(409).json(response({ message: req.t('Request type not defined properly'), status: "Error", statusCode: 409 }));
      }
    }
    // else if(user.oneTimeCode !== oneTimeCode){
    //   user.emailVerificationAttemps = user.emailVerificationAttemps + 1;
    //   await user.save();
    //   res.status(400).json(response({ message:req.t( 'Invalid OTC', status: "OK", statusCode: 400 }));
    // }
    else if (user.oneTimeCode === null) {
      res.status(408).json(response({ message: req.t('One Time Code has expired'), status: "OK", statusCode: 408 }));
    }
    else {
      res.status(406).json(response({ message: req.t('Requirements not fulfilled in verifying OTC'), status: "Error", statusCode: 406 }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl);
    res.status(500).json(response({ message: req.t('Error verifying OTC'), status: "OK", statusCode: 500 }));
  }
};

//Update password without login
const updatePassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!validatePassword(password)) {
      return res.status(400).json(
        response({
          status: 'Error',
          statusCode: '400',
          message: req.t('New password does not meet the criteria, password must be at least 8 characters long, contain at least one letter or special character'),
        })
      );
    }
    console.log(email);
    const user = await User.findOne({ email });
    if (!user || user.status !== 'accepted') {
      return res.status(400).json(response({ message: req.t('User does not exist'), status: "OK", statusCode: 200 }));
    }
    else if (user.oneTimeCode === 'verified') {
      user.password = password;
      user.oneTimeCode = null;
      await user.save();
      res.status(200).json(response({ message: req.t('Password updated successfully'), status: "OK", statusCode: 200 }));
    }
    else {
      res.status(200).json(response({ message: req.t('Something went wrong, try forget password again'), status: "OK", statusCode: 200 }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl);
    res.status(500).json(response({ message: req.t('Error updating password'), status: "OK", statusCode: 200 }));
  }
};

const updateProfile = async (req, res) => {
  try {
    let { fullName, phoneNumber, address, dateOfBirth } = req.body;
    if (dateOfBirth) {
      dateOfBirth = new Date(dateOfBirth)
      if (isNaN(dateOfBirth.getTime())) {
        if (req.file) {
          unlinkImages(req.file.path)
        }
        return res.status(403).json(response({ status: 'Error', statusCode: '403', type: 'user', message: req.t('Invalid date of birth') }));
      }
    }

    if (phoneNumber) {
      if (!/^\+225\d{6,10}$/.test(phoneNumber)) {
        if (req.file) {
          unlinkImages(req.file.path)
        }
        return res.status(403).json(response({ status: 'Error', statusCode: '403', type: 'user', message: req.t('Invalid phone number format') }));
      }
    }
    // Check if the user already exists
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser || checkUser.status !== 'accepted') {
      if (req.file) {
        unlinkImages(req.file.path)
      }
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    console.log('all value-------->', req.body)
    const user = {
      fullName: !fullName ? checkUser.fullName : fullName,
      phoneNumber: !phoneNumber ? checkUser.phoneNumber : phoneNumber,
      address: !address ? checkUser.address : address,
      dateOfBirth: !dateOfBirth ? checkUser.dateOfBirth : dateOfBirth,
    };

    //checking if user has provided any photo
    if (req.file) {
      //checking if user has any photo link in the database
      if (checkUser.image && checkUser.image.path !== 'public\\uploads\\users\\user-1695552693976.jpg') {
        //deleting the image from the server
        //console.log('unlinking image---------------------------->',checkUser.image.path)
        unlinkImages(checkUser.image.path)
      }
      const publicFileUrl = `${req.protocol}://${req.get('host')}/uploads/users/${req.file.filename}`;
      const fileInfo = {
        publicFileUrl,
        path: req.file.path
      };

      user.image = fileInfo
    }
    const result = await User.findByIdAndUpdate(checkUser._id, user, options);
    console.log('update result--------------->', user, result)
    return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'user', message: req.t('User profile edited successfully'), data: result }));
  }
  catch (error) {
    logger.error(error, req.originalUrl);
    //providing the image path saved in the server
    if (req.file) {
      unlinkImages(req.file.path)
    }
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'user', message: error.message }));
  }
};

const userDetails = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    const id = req.params.id
    if (!checkUser || checkUser.status !== 'accepted') {
      if (req.file) {
        unlinkImages(req.file.path)
      }
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const user = await User.findById(id)
      .select('fullName email phoneNumber address image dateOfBirth');

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'user',
        message: req.t('User details retrieved successfully'),
        data: {
          user
        },
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting residences'),
      })
    );
  }
};

const allUser = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }
    const search = req.query.search || '';
    const userType = req.query.userType || 'user'
    const userAccountStatus = !req.query.userAccountStatus ? 'accepted' : req.query.userAccountStatus;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const searchRegExp = new RegExp('.*' + search + '.*', 'i');
    const filter = {
      $or: [
        { email: { $regex: searchRegExp } },
        { fullName: { $regex: searchRegExp } },
        { phoneNumber: { $regex: searchRegExp } },
      ],
    };
    if (userType) {
      filter.$and = filter.$and || [];
      filter.$and.push({ role: userType })
    }
    if (userAccountStatus) {
      filter.$and = filter.$and || [];
      filter.$and.push({ status: userAccountStatus })
    }

    let users = [];
    let completed = {}
    let count = 0;

    if (checkUser.role === 'super-admin') {
      users = await User.find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 });

      //console.log(users)
      for (const user of users) {
        const uid = user._id

        if (userType === 'user') {
          completed[uid] = await Booking.countDocuments({ status: 'completed', userId: uid });
        }
        else {
          completed[uid] = await Booking.countDocuments({ status: 'completed', hostId: uid });
        }
        // }
      }

      count = await User.countDocuments(filter);
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'user', message: req.t('You are not authorised to get all user details'), data: null }));
    }

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'user',
        message: req.t('Users retrieved successfully'),
        data: {
          users,
          completeHistory: completed,
          pagination: {
            totalDocuments: count,
            totalPage: Math.ceil(count / limit),
            currentPage: page,
            previousPage: page > 1 ? page - 1 : null,
            nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
          },
        },
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting users'),
      })
    );
  }
};

// Change Password
const changePassword = async (req, res) => {
  console.log(req.body.userId)
  try {
    const { currentPassword, newPassword } = req.body;
    if (!validatePassword(newPassword)) {
      return res.status(400).json(
        response({
          status: 'Error',
          statusCode: '400',
          message: req.t('New password does not meet the criteria, password must be at least 8 characters long, contain at least one letter or special character'),
        })
      );
    }

    const checkUser = await User.findOne({ _id: req.body.userId });

    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }


    const passwordMatch = await bcrypt.compare(currentPassword, checkUser.password);

    if (!passwordMatch) {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: req.t('Current password is incorrect'),
        })
      );
    }

    checkUser.password = newPassword;
    await checkUser.save()

    console.log(checkUser)
    return res.status(200).json(
      response({
        status: 'Success',
        statusCode: '200',
        message: req.t('Password changed successfully'),
        data: checkUser
      })
    );
  } catch (error) {
    logger.error(error, req.originalUrl);
    console.log(error)
    return res.status(500).json(response({ status: 'Edited', statusCode: '500', type: 'user', message: req.t('An error occurred while changing password') }));
  }
}

const updateUserStatus = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }
    const id = req.params.id
    const existingUser = await User.findById(id)
    if (!existingUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }
    const requestType = !req.query.requestType ? 'accept' : req.query.requestType;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json(
        response({
          status: 'Error',
          statusCode: '400',
          message: 'Status is required',
        })
      );
    }
    if (checkUser.role === 'super-admin') {
      if (requestType === 'accept') {
        if (status === 'accepted' && existingUser.status !== 'deleted' && existingUser.emailVerified === true) {
          existingUser.status = status
          await existingUser.save()
          await Residence.updateMany({ hostId: id, acceptanceStatus: 'blocked' }, { acceptanceStatus: 'reserved' }, { new: true })
          return res.status(200).json(
            response({
              status: 'OK',
              statusCode: '200',
              type: 'user',
              message: 'User status updated successfully',
              data: {
                user: existingUser
              },
            })
          );
        }
        else {
          return res.status(400).json(
            response({
              status: 'Error',
              statusCode: '400',
              message: 'User update credentials not fulfilled',
            })
          );
        }
      }
      else {
        const existingResidence = await Residence.findOne({ hostId: id, status: 'reserved' })
        if (existingResidence) {
          return res.status(400).json(
            response({
              status: 'Error',
              statusCode: '400',
              message: 'Update users status failed due to having reserved residence',
            })
          );
        }
        if (requestType === 'suspend') {
          if (status === 'suspended' && existingUser.status !== 'deleted') {
            existingUser.status = status
            await existingUser.save()
            await Residence.updateMany({ hostId: id }, { acceptanceStatus: 'blocked' }, { new: true })
          }
          else {
            return res.status(400).json(
              response({
                status: 'Error',
                statusCode: '400',
                message: 'User update credentials not fulfilled',
              })
            );
          }
        }
        else if (requestType === 'ban') {
          if (status === 'banned' && existingUser.status !== 'deleted') {
            existingUser.status = status
            await existingUser.save()
            await Residence.updateMany({ hostId: id }, { acceptanceStatus: 'blocked' }, { new: true })
          }
          else {
            return res.status(400).json(
              response({
                status: 'Error',
                statusCode: '400',
                message: 'User update credentials not fulfilled',
              })
            );
          }
        }
        else if (requestType === 'delete') {
          if (status === 'deleted' && existingUser.status !== 'deleted') {
            existingUser.status = status
            await existingUser.save()
            await Residence.updateMany({ hostId: id }, { acceptanceStatus: 'deleted' }, { new: true })
          }
          else {
            return res.status(400).json(
              response({
                status: 'Error',
                statusCode: '400',
                message: 'User update credentials not fulfilled',
              })
            );
          }
        }
        else {
          return res.status(400).json(
            response({
              status: 'Error',
              statusCode: '400',
              message: 'Request type not defined properly',
            })
          );
        }
      }
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'user',
          message: 'User status updated successfully',
          data: existingUser
        })
      );
    }
    else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'user', message: 'You are not authorised to get all user details', data: null }));
    }
  }
  catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting users',
      })
    );
  }
};


module.exports = { signUp, signIn, processForgetPassword, changePassword, verifyOneTimeCode, updatePassword, updateProfile, userDetails, allUser, resendOneTimeCode, updateUserStatus, createUser }