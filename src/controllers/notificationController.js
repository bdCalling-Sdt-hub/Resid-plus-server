const response = require("../helpers/response");
const mongoose = require('mongoose')
const Notification = require("../models/Notification");

async function addNotification(data, type) {
  try {

    // Create a new notification using the data provided
    const newNotification = new Notification(data);

    // Save the notification to the database
    await newNotification.save();
    if (newNotification) {
      return await getAllNotification(type, limit = 10, page = 1)
    }
  }
  catch (error) {
    console.error("Error adding notification:", error);
  }
}
async function getAllNotification(type, limit = 10, page = 1) {
  try {
    // Create a new notification using the data provided
    const allNotification = await Notification.find({ type: type })
      .limit(limit)
      .skip((page - 1) * limit)
    const notViewed = await Notification.countDocuments({ viewStatus: 'false', type: type });
    const count = await Notification.countDocuments({ type: type });
    if (allNotification.length > 0 && type !== 'conversation') {
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
    else {
      return null;
    }
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
    const id = req.params.id
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;

    var type = checkUser.role

    return await getAllNotification(type, page, limit)
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

const updateNotification = async (req, res) => {
  console.log(req.body)
  try {
    const checkUser = await User.findById(req.body.userId);
    //extracting the notification id from param that is going to be edited
    const id = req.params.id
    if (!checkUser) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', message: 'User not found' }));
    };
    const notification = await Notification.findById(id)
    notification.viewStatus = true
    await notification.save()
    return await getAllNotification(notification.type)
  }
  catch (error) {
    console.error(error);
    //deleting the images if something went wrong

    return res.status(500).json(response({ status: 'Error', statusCode: '500', message: 'Error changing notification view-status' }));
  }
};



module.exports = { addNotification, getAllNotification, updateNotification, allNotifications };