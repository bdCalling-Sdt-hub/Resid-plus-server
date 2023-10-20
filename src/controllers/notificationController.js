const response = require("../helpers/response");
const mongoose = require('mongoose')
const Notification = require("../models/Notification");
const User = require('../models/User')
const Booking = require('../models/Booking')
const Residence = require('../models/Residence')

async function addNotification(data) {
  try {

    // Create a new notification using the data provided
    const newNotification = new Notification(data);

    // Save the notification to the database
    await newNotification.save();
  }
  catch (error) {
    console.error("Error adding notification:", error);
  }
}
async function addManyNotifications(data) {
  try {

    // Create a new notification using the data provided
    await Notification.insertMany(data);
  }
  catch (error) {
    console.error("Error adding notification:", error);
  }
}
async function getAllNotification(role, limit = 10, page = 1, receiverId = null) {
  try {
    // Create a new notification using the data provided
    var allNotification
    var notViewed
    var count
    if (role === 'admin') {
      allNotification = await Notification.find({ role: role })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
      notViewed = await Notification.countDocuments({ viewStatus: 'false', role: role });
      count = await Notification.countDocuments({ role: role });
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
    console.error("Error adding notification:", error);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Server error in retriving notifications' }));
  }
}

const allNotifications = async (req, res) => {

  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the notification id from param that is going to be edited
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    var role = checkUser.role
    var allNotification
    var notViewed
    var count
    if (role === 'admin') {
      allNotification = await Notification.find({ role: role })
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
      notViewed = await Notification.countDocuments({ viewStatus: 'false', role: role });
      count = await Notification.countDocuments({ role: role });
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
          message: 'Role not specified for notifications',
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
    if (role === 'admin') {
      io.emit('admin-notification', data)
    }
    else {
      io.to('room' + req.body.userId).emit(`${role}-notification`, data)
    }
    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'notification',
        message: 'Notifications retrieved successfully',
        data: data
      })
    );
  }
  catch (error) {
    console.log(error);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        message: 'Error getting notifications',
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
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
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
    if (role === 'admin') {
      io.emit('admin-notification', data)
    }
    else if (role === 'user' || role === 'host') {
      io.to('room' + req.body.userId).emit(`${role}-notification`, data)
    }
    console.log('details api response ----------------->', details)
    return res.status(200).json(response({ status: 'OK', statusCode: '200', type: type, message: 'Notifications retrieved successfully', data: details }))
  }
  catch (error) {
    console.error(error);
    //deleting the images if something went wrong

    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error changing notification view-status' }));
  }
};

async function updateAndGetNotificationDetails(userId, notificationId, pages = 1, limits = 10) {
  console.log(req.body)
  try {
    const checkUser = await User.findById(userId);
    //extracting the notification id from param that is going to be edited
    const id = notificationId
    const page = Number(pages) || 1;
    const limit = Number(limits) || 10;
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const notification = await Notification.findById(id)
    if (!notification.viewStatus) {
      notification.viewStatus = true
      await notification.save()
    }
    const role = notification.role
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
    io.emit('admin-notification', data)
  }
  catch (error) {
    console.error(error);
    //deleting the images if something went wrong

    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error changing notification view-status' }));
  }
};


module.exports = { addNotification, addManyNotifications, getAllNotification, getNotificationDetails, allNotifications, updateAndGetNotificationDetails };