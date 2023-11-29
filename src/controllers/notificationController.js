const response = require("../helpers/response");
const mongoose = require('mongoose')
const Notification = require("../models/Notification");
const User = require('../models/User')
const Booking = require('../models/Booking')
const Residence = require('../models/Residence');
const logger = require("../helpers/logger");

async function addNotification(data) {
  try {

    // Create a new notification using the data provided
    const newNotification = new Notification(data);

    // Save the notification to the database
    const notif = await newNotification.save();
    return notif;
  }
  catch (error) {
    logger.error(error, 'from: add-notification')
    console.error("Error adding notification:", error);
  }
}
async function addManyNotifications(data) {
  try {
    // Create a new notification using the data provided
    const insertedNotifications = await Notification.insertMany(data);
    const userHostNotifications = insertedNotifications.filter(notification =>
      notification.role === 'user' || notification.role === 'host'
    );
    
    const firstObject = userHostNotifications[0]; // Accessing the first object
    
    return firstObject;
  }
  catch (error) {
    logger.error(error, 'from: add-multiple-notification')
    console.error("Error adding notification:", error);
  }
}
async function getAllNotification(role, limit = 10, page = 1, receiverId = null) {
  try {
    // Create a new notification using the data provided
    var allNotification
    var notViewed
    var count
    if (role === 'super-admin' || role === 'admin') {
      var filter
      if (role === 'super-admin') {
        filter = { role: { $in: ['admin', 'super-admin'] } }
      }
      if (role === 'admin') {
        filter = { role: 'admin', type: 'residence' }
      }
      allNotification = await Notification.find({ role: role, ...filter })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
      notViewed = await Notification.countDocuments({ viewStatus: 'false', role: role, ...filter });
      count = await Notification.countDocuments({ role: role, ...filter });
    }
    else if (role === 'user' || role === 'host') {
      allNotification = await Notification.find({ receiverId: receiverId, role: role })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
      notViewed = await Notification.countDocuments({ viewStatus: 'false', receiverId: receiverId, role: role });
      count = await Notification.countDocuments({ receiverId: receiverId, role: role });
    }
    const data = {
      allNotification,
      notViewed: notViewed,
      pagination: {
        totalDocuments: count,
        totalPage: Math.ceil(count / limit),
        currentPage: page,
        previousPage: page > 1 ? page - 1 : null,
        nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
      },
    }
    return data
  }
  catch (error) {
    logger.error(error, 'from: get all notification')
    console.error("Error adding notification:", error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Server error in retriving notifications') }));
  }
}

const allNotifications = async (req, res) => {

  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the notification id from param that is going to be edited
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    var role = checkUser.role
    var allNotification
    var notViewed
    var count
    if (role === 'super-admin' || role === 'admin') {
      var filter
      if (role === 'super-admin') {
        filter = { role: { $in: ['admin', 'super-admin'] } }
      }
      if (role === 'admin') {
        filter = { role: 'admin', type: 'residence' }
      }
      allNotification = await Notification.find({ role: role, ...filter })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
      notViewed = await Notification.countDocuments({ viewStatus: 'false', role: role, ...filter });
      count = await Notification.countDocuments({ role: role, ...filter });
    }
    else if (role === 'user' || role === 'host') {
      allNotification = await Notification.find({ receiverId: req.body.userId, role: role })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
      notViewed = await Notification.countDocuments({ viewStatus: 'false', receiverId: req.body.userId, role: role });
      count = await Notification.countDocuments({ receiverId: req.body.userId, role: role });
    }
    else {
      return res.status(500).json(
        response({
          status: 'Error',
          statusCode: '500',
          type: 'notifications',
          message: req.t('Role not specified for notifications'),
        })
      );
    }
    const data = {
      allNotification,
      notViewed: notViewed,
      pagination: {
        totalDocuments: count,
        totalPage: Math.ceil(count / limit),
        currentPage: page,
        previousPage: page > 1 ? page - 1 : null,
        nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
      },
    }
    if (role === 'super-admin') {
      io.emit('super-admin-notification', data)
    }
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'notification',
        message: req.t('Notifications retrieved successfully'),
        data: data
      })
    );
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: req.t('Error getting notifications'),
      })
    );
  }
};

const getNotificationDetails = async (req, res) => {
  console.log(req.body)
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the notification id from param that is going to be edited
    const id = req.params.id
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    if (!checkUser || checkUser.status !== 'accepted') {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: req.t('User not found') }));
    };
    const notification = await Notification.findById(id)
    if (!notification.viewStatus) {
      notification.viewStatus = true
      await notification.save()
    }
    const role = notification.role
    const type = notification.type
    var details
    if (type === 'booking') {
      details = await Booking.findById(notification.linkId).populate('residenceId hostId userId')
    }
    else if (type === 'residence') {
      details = await Residence.findById(notification.linkId).populate('hostId')
    }
    else if (type === 'user') {
      details = await User.findById(notification.linkId)
    }
    //retriving all notifications
    const allNotification = await Notification.find({ role: role })
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
    const notViewed = await Notification.countDocuments({ viewStatus: 'false', role: role });
    const count = await Notification.countDocuments({ role: role });
    const data = {
      allNotification,
      notViewed: notViewed,
      pagination: {
        totalDocuments: count,
        totalPage: Math.ceil(count / limit),
        currentPage: page,
        previousPage: page > 1 ? page - 1 : null,
        nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
      },
    }
    if (role === 'super-admin') {
      io.emit('super-admin-notification', data)
    }
    return res.status(200).json(response({ status: 'OK', statusCode: '200', type: type, message: req.t('Notifications retrieved successfully'), data: details }))
  }
  catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error);
    //deleting the images if something went wrong

    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: req.t('Error changing notification view-status') }));
  }
};

module.exports = { addNotification, addManyNotifications, getAllNotification, getNotificationDetails, allNotifications };