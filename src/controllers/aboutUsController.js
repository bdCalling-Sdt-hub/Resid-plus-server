const AboutUs = require("../models/AboutUs");
const User = require("../models/User");
const response = require("../helpers/response");
const logger = require("../helpers/logger");

const createAboutUs = async (req, res) => {
  const { content } = req.body;
  try {
    const user = await User.findById(req.body.userId);
    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (user.role !== 'admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'about-us', message: req.t('You are not Authorization') }));
    }

    // Check if an About us entry already exists
    let aboutUs = await AboutUs.findOne();

    if (!aboutUs) {
      // If no entry exists, create a new one
      aboutUs = new AboutUs({ content });
      await aboutUs.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'about-us', message: req.t('About-us added successfully.'), data: aboutUs }));
    }

    // If an entry exists, update its content
    aboutUs.content = content;
    await aboutUs.save();
    return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'about-us', message: req.t('About us content updated successfully'), data: aboutUs }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'about-us', message: req.t('Server error') }));
  }
};

const getAll = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const aboutUs = await AboutUs.findOne();

    if (!aboutUs) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'about-us', message: req.t('About us content not found') }));
    }

    //const aboutUsContentWithoutTags = aboutUs.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'about-us', message: req.t('About us content retrieved successfully'), data: aboutUs }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'about-us', message: req.t('Server Error') }));
  }
};

const getAllForWebSite = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const aboutUs = await AboutUs.findOne();

    if (!aboutUs) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'about-us', message: req.t('About us content not found') }));
    }

    //const aboutUsContentWithoutTags = aboutUs.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'about-us', message: req.t('About us content retrieved successfully'), data: aboutUs }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'about-us', message: req.t('Server Error') }));
  }
};

module.exports = { createAboutUs, getAll, getAllForWebSite };