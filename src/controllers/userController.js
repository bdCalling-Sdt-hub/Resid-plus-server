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
const Activity = require('../models/Activity')

//Sign up
const signUp = async (req, res) => {
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

    // Create the user in the database
    const user = await User.create({
      fullName,
      email,
      phoneNumber,
      address,
      dateOfBirth,
      password,
      role
    });

    res.status(201).json(response({
      status: "Created",
      message: "User created successfully",
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

    var accessToken
    if (user.role === 'admin') {
      const activity = await Activity.create({
        operatingSystem: deviceModel,
        browser,
        userId: user._id
      });
      console.log(activity)
      accessToken = jwt.sign({ _id: user._id, email: user.email, role: user.role, activityId: activity._id }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '12h' });
    }

    //Token, set the Cokkie
    accessToken = jwt.sign({ _id: user._id, email: user.email }, process.env.JWT_ACCESS_TOKEN, { expiresIn: '12h' });

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
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'user', message: 'Error in updating user' }));
  }
};

const userDetails = async (req, res) => {
  try {
    const checkUser = await User.findOne({ _id: req.body.userId });
    const id = req.params.id
    if (!checkUser) {
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

    if (checkUser.role === 'admin') {
      return res.status(409).json(response({ statusCode: 200, message: 'You are not authorised to get profile details', status: "OK" }));
    }

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


module.exports = { signUp, signIn, processForgetPassword, changePassword, verifyOneTimeCode, updatePassword, updateProfile, userDetails, allUser }