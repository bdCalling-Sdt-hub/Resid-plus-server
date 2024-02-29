const Event = require("../models/Event");
require('dotenv').config();
const logger = require('../helpers/logger');
const response = require('../helpers/response');
const unlinkImages = require("../common/image/unlinkImage");

const addEvent = async (req, res) => {
  var { title, role, expiaryDate } = req.body;
  try {
    if (req.body.userRole !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          type: 'event',
          message: req.t('You are not Authorized'),
        })
      );
    }
    var image

    if (req.file) {
      const publicFileUrl = `${req.protocol}://${req.get('host')}/uploads/events/${req.file.filename}`;
      const fileInfo = {
        publicFileUrl,
        path: req.file.path
      };

      image = fileInfo
    }
    expiaryDate = new Date(expiaryDate)
    if (!title || !role || !expiaryDate) {
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '400',
          type: 'event',
          message: req.t('All fields are required'),
        })
      );
    }

    const event = new Event({ image, title, role, expiaryDate });

    await event.save();
    return res.status(201).json(
      response({
        status: 'OK',
        statusCode: '201',
        type: 'event',
        message: req.t('Event added successfully'),
        data: event,
      })
    );
  } catch (error) {
    console.error(error);
    logger.error(error, req.originalUrl);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        type: 'event',
        message: req.t('Internal server error')
      })
    );
  }
}

const getEvents = async (req, res) => {
  try {
    if (req.body.userRole === 'super-admin') {
      const page = Number(req.query.page) || 1
      const limit = Number(req.query.limit) || 10
      const skip = (page - 1) * limit;
      const adminEvent = await Event.find().skip(skip).limit(limit)
      const count = await Event.countDocuments()
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'event',
          message: req.t('Events retrieved successfully'),
          data: {
            adminEvent,
            pagination: {
              totalDocuments: count,
              totalPage: Math.ceil(count / limit),
              currentPage: page,
              previousPage: page > 1 ? page - 1 : null,
              nextPage: page < Math.ceil(count / limit) ? page + 1 : null,
            }
          }
        })
      );
    }
    else {
      const events = await Event.find({
        role: { $in: [req.body.userRole] },
        expiaryDate: { $gte: new Date() }
      }).select('image title');
      return res.status(200).json(
        response({
          status: 'OK',
          statusCode: '200',
          type: 'event',
          message: req.t('Events retrieved successfully'),
          data: events,
        })
      );
    }
  } catch (error) {
    console.error(error);
    logger.error(error, req.originalUrl);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        type: 'event',
        message: req.t('Internal server error'),
      })
    );
  }
}

const deleteEvent = async (req, res) => {
  try {
    if (req.body.userRole !== 'super-admin') {
      return res.status(401).json(
        response({
          status: 'Error',
          statusCode: '401',
          type: 'event',
          message: req.t('You are not Authorized'),
        })
      );
    }
    const eventId = req.params.id;

// Find the event by ID
const event = await Event.findById(eventId);

// Check if the event has an associated image
if (event.image) {
  // Remove the associated image
  unlinkImages(event.image.path);
}

// Delete the event by ID
await Event.deleteOne({ _id: eventId });

console.log(`Event with ID ${eventId} deleted successfully along with its associated image`);

    return res.status(200).json(
      response({
        status: 'OK',
        statusCode: '200',
        type: 'event',
        message: req.t('Event deleted successfully'),
      })
    );
  } catch (error) {
    console.error(error);
    logger.error(error, req.originalUrl);
    return res.status(500).json(
      response({
        status: 'Error',
        statusCode: '500',
        type: 'event',
        message: req.t('Internal server error'),
      })
    );
  }
}


module.exports = { addEvent, getEvents, deleteEvent }