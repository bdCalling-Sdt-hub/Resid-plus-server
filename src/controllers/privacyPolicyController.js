const PrivacyPolicy = require("../models/PrivacyPolicy");
const User = require("../models/User");
const response = require("../helpers/response");
const logger = require("../helpers/logger");

const createPrivacyPolicy = async (req, res) => {
  try {
    const { content } = req.body;
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'privacy-policy', message: req.t('You are not Authorization') }));
    }

    // Check if an Privacy Policy entry already exists
    let privacyPolicy = await PrivacyPolicy.findOne();

    if (!privacyPolicy) {
      // If no entry exists, create a new one
      privacyPolicy = new PrivacyPolicy({ content });
      await privacyPolicy.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'privacy-policy', message: req.t('Privacy-policy added successfully.'), data: privacyPolicy }));
    }

    // If an entry exists, update its content
    privacyPolicy.content = content;
    await privacyPolicy.save();
    return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'privacy-policy', message: req.t('Privacy Policy content updated successfully'), data: privacyPolicy }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'privacy-policy', message: req.t('Server error')}));
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

    const privacyPolicy = await PrivacyPolicy.findOne();

    if (!privacyPolicy) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'privacy-policy', message: req.t('Privacy Policy content not found') }));
    }

    //const privacyPolicyContentWithoutTags = privacyPolicy.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'privacy-policy', message: req.t('Privacy Policy content retrieved successfully'), data: privacyPolicy }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'privacy-policy', message: req.t('Server Error') }));
  }
};
const getAllForWebSite = async (req, res) => {
  try {
    const privacyPolicy = await PrivacyPolicy.findOne();

    if (!privacyPolicy) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'privacy-policy', message: req.t('Privacy Policy content not found') }));
    }

    //const privacyPolicyContentWithoutTags = privacyPolicy.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'privacy-policy', message: req.t('Privacy Policy content retrieved successfully'), data: privacyPolicy }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'privacy-policy', message: req.t('Server Error') }));
  }
};

module.exports = { createPrivacyPolicy, getAll, getAllForWebSite };