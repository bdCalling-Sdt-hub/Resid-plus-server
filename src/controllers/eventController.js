const Event = require("../models/Event");
require('dotenv').config();
const logger = require('../helpers/logger');
const response = require('../helpers/response');
const unlinkImages = require("../common/image/unlinkImage");

const addEvent = async (req, res) => {
  var { title, role, expiaryDate } = req.body;
  try {
    if(req.body.userRole !== 'super-admin'){
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
    if( !title || !role || !expiaryDate){
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

module.exports = { addEvent, getEvents }