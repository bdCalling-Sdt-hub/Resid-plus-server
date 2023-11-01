const Support = require("../models/Support");
const User = require("../models/User");
const response = require("../helpers/response");
const logger = require("../helpers/logger");

const createSupport = async (req, res) => {
  const { content } = req.body;

  try {

    const user = await User.findById(req.body.userId);

    if (!user) {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: 'User not found',
        })
      );
    }

    if (user.role !== 'admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'support', message: 'You are not Authorization' }));
    }

    // Check if an About us entry already exists
    let support = await Support.findOne();

    if (!support) {
      // If no entry exists, create a new one
      support = new Support({ content });
      await support.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'support', message: 'Support added successfully.', data: support }));
    }

    // If an entry exists, update its content
    support.content = content;
    await support.save();
    return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'support', message: 'About us content updated successfully', data: support }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'support', message: 'Server error'}));
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
          message: 'User not found',
        })
      );
    }

    const support = await Support.findOne();

    if (!support) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'support', message: 'About us content not found' }));
    }

    //const supportContentWithoutTags = support.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'support', message: 'About us content retrieved successfully', data: support }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'support', message: 'Server Error' }));
  }
};

module.exports = { createSupport, getAll };