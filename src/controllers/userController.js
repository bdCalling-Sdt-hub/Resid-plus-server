const User = require("../models/User");
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
const e = require("express");

//Sign up
const signUp = async (req, res) => {
  console.log(req.body)
  try {
    const { fullName, email, phoneNumber, address, dateOfBirth, password, role } = req.body;

    // Check if the user already exists
    const userExist = await User.findOne({ email });
    if (userExist) {
      return res.status(409).json(response({ statusCode: 200, message: 'User already exists', status: "OK" }));
    }

    //role as admin is not allowed to be signed-up
    // if(role==='admin'){
    //   return res.status(409).json(response({ statusCode: 200, message: 'You are not authorized to sign-up', status: "OK" }));
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
      console.log('email send to verify ---------------->', emailData)
      // Send email
      try {
        await emailWithNodemailer(emailData);
      } catch (emailError) {
        console.error('Failed to send verification email', emailError);
      }
      setTimeout(async () => {
        try {
          user.oneTimeCode = null;
          await user.save();
          console.log('oneTimeCode reset to null after 3 minute');
        } catch (error) {
          console.error('Error updating oneTimeCode:', error);
        }
      }, 180000); // 3 minute in milliseconds
    }

    res.status(201).json(response({
      status: "Created",
      message: "User created successfully and a verification code just sent to the email",
      statusCode: 201,
      type: "user",
      data: user,
    }));

  } catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'user', message: 'Error creating user' }));
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

    let activityId = null
    if (user.role === 'admin') {
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

const resendOneTimeCode = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json(response({ statusCode: 200, message: 'User does not exist', status: "OK" }));
    }
    const requestType = !req.query.requestType ? 'resetPassword' : req.query.requestType;
    const oneTimeCode = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
    const subject = requestType === 'resetPassword' ? 'Password Reset Email' : 'User verification code';
    const topic = requestType === 'resetPassword' ? 'reset password' : 'verify account';
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

    res.status(201).json(response({ message: `Thanks! Please check your email to ${topic}`, status: "OK", statusCode: 200 }));
  } catch (error) {
    res.status(500).json(response({ message: 'Error processing forget password', statusCode: 200, status: "OK" }));
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
    if (!user) {
      return res.status(40).json(response({ message: 'User does not exist', status: "OK", statusCode: 200 }));
    } else if (user.oneTimeCode === oneTimeCode) {
      if (requestType === 'resetPassword') {
        user.oneTimeCode = 'verified';
        await user.save();
        res.status(200).json(response({ message: 'One Time Code verified successfully', type: "reset-forget password", status: "OK", statusCode: 200, data: user }));
      }
      else if (requestType === 'verifyEmail' && user.oneTimeCode !== null && user.emailVerified === false) {
        console.log('email verify---------------->', user)
        user.emailVerified = true;
        user.oneTimeCode = null;
        await user.save();
        res.status(200).json(response({ message: 'Email verified successfully', status: "OK", type: "email verification", statusCode: 200, data: user }));
      }
      else {
        res.status(409).json(response({ message: 'Request type not defined properly', status: "Error", statusCode: 409 }));
      }
    }
    else if (user.oneTimeCode === null) {
      res.status(400).json(response({ message: 'One Time Code has expired', status: "OK", statusCode: 200 }));
    }
    else {
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
    console.log(email);
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json(response({ message: 'User does not exist', status: "OK", statusCode: 200 }));
    } else if (user.oneTimeCode === 'verified') {
      user.password = password;
      user.oneTimeCode = null;
      await user.save();
      res.status(200).json(response({ message: 'Password updated successfully', status: "OK", statusCode: 200 }));
    }
    else {
      res.status(200).json(response({ message: 'Something went wrong, try forget password again', status: "OK", statusCode: 200 }));
    }
  } catch (error) {
    res.status(500).json(response({ message: 'Error updating password', status: "OK", statusCode: 200 }));
  }
};

const updateProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, address, dateOfBirth } = req.body;

    // Check if the user already exists
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser) {
      if (req.file) {
        unlinkImages(req.file.path)
      }
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const user = {
      fullName,
      phoneNumber,
      address,
      dateOfBirth
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
    const options = { new: true };
    const result = await User.findByIdAndUpdate(checkUser._id, user, options);

    //console.log('result---------------------------->',result)
    return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'user', message: 'User profile edited successfully.', data: result }));
  }
  catch (error) {
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
    if (!checkUser) {
      if (req.file) {
        unlinkImages(req.file.path)
      }
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
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
        message: 'User details retrieved successfully',
        data: {
          user
        },
      })
    );
  } catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting residences',
      })
    );
  }
};

const deactivateUser = async (req, res) => {
  try {
    const checkHost = await User.findById(req.body.userId);
    //extracting the residence id from param that is going to be deleted
    const id = req.params.id
    if (!checkHost) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    if (checkHost.role === 'host') {
      const residenceDetails = await Residence.findOne({ _id: id })

      if (residenceDetails && !residenceDetails.isDeleted) {
        residenceDetails.isDeleted = true;
        residenceDetails.save();
        await Booking.updateMany({ residenceId: id }, { $set: { isDeleted: true } });
        return res.status(201).json(response({ status: 'Deleted', statusCode: '201', type: 'residence', message: 'Residence deleted successfully.', data: residenceDetails }));
      }
      else {
        return res.status(404).json(response({ status: 'Error', statusCode: '404', type: "residence", message: 'Delete credentials not match' }));
      }
    } else {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', message: 'You are Not authorize to add residence' }));
    }
  }
  catch (error) {
    console.error(error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error deleted residence' }));
  }
}

const allUser = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }
    const search = req.query.search || '';
    const userType = req.query.userType || 'user'
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

    let users = [];
    let completed = {}
    let count = 0;

    if (checkUser.role === 'admin') {
      users = await User.find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ popularity: -1 });

      console.log(users)
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'user', message: 'You are not authorised to get all user details', data: null }));
    }

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'user',
        message: 'Users retrieved successfully',
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

// Change Password
const changePassword = async (req, res) => {
  console.log(req.body.userId)
  try {
    const { currentPassword, newPassword } = req.body;
    const checkUser = await User.findOne({ _id: req.body.userId });

    if (!checkUser) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }


    const passwordMatch = await bcrypt.compare(currentPassword, checkUser.password);

    if (!passwordMatch) {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          message: 'Current password is incorrect',
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
        message: 'Password changed successfully',
        data: checkUser
      })
    );
  } catch (error) {
    console.log(error)
    return res.status(500).json(response({ status: 'Edited', statusCode: '500', type: 'user', message: 'An error occurred while changing password' }));
  }
}


module.exports = { signUp, signIn, processForgetPassword, changePassword, verifyOneTimeCode, updatePassword, updateProfile, userDetails, allUser, resendOneTimeCode }