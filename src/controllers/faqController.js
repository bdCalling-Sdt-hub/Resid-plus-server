const Faq = require("../models/Faq");
const User = require("../models/User");
const response = require("../helpers/response");
const logger = require("../helpers/logger");

const createFaq = async (req, res) => {
  const { question, answer } = req.body;

  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (user.role !== 'super-admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: req.t('You are not Authorized') }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findOne({ question: question, answer: answer });

    if (!faq) {
      // If no entry exists, create a new one
      faq = new Faq({ question, answer });
      await faq.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'faq', message: req.t('Faq added successfully.'), data: faq }));
    }

    // If an entry exists, update its content
    else {
      return res.status(201).json(response({ status: 'Error', statusCode: '201', type: 'faq', message: req.t('Faq already exists'), data: faq }));
    }
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: req.t('Server error') }));
  }
};

const updateFaq = async (req, res) => {
  try {
    const id = req.params.id;
    const { question, answer } = req.body;
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (user.role !== 'super-admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: req.t('You are not Authorized') }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findById(id);

    if (!faq) {
      // If no entry exists, create a new one
      faq = new Faq({ question, answer });
      await faq.save();
      return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'faq', message: req.t('No faq found') }));
    }

    faq.question = question;
    faq.answer = answer;
    await faq.save();
    return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'faq', message: req.t('Faq updated successfully.'), data: faq }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: req.t('Server error') }));
  }
};

const deleteFaq = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (user.role !== 'super-admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: req.t('You are not Authorized') }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findById(id);

    if (!faq) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'faq', message: req.t('No faq found') }));
    }

    await Faq.findByIdAndDelete(id);
    return res.status(201).json(response({ status: 'deleted', statusCode: '201', type: 'faq', message: req.t('Faq deleted successfully.'), data: faq }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: req.t('Server error') }));
  }
};

const getFaqById = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    if (user.role !== 'super-admin') {
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: req.t('You are not Authorized') }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findById(id);

    if (!faq) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'faq', message: req.t('No faq found') }));
    }
    return res.status(201).json(response({ status: 'OK', statusCode: '201', type: 'faq', message: req.t('Faq retrived successfully.'), data: faq }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: req.t('Server error') }));
  }
};



const getAll = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);

    if (!user || user.status!=='accepted') {
      return res.status(404).json(
        response({
          status: 'Error',
          statusCode: '404',
          message: req.t('User not found'),
        })
      );
    }

    const faq = await Faq.find();

    //const faqContentWithoutTags = faq.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'faq', message: req.t('faq content retrieved successfully'), data: faq }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: req.t('Server Error') }));
  }
};
const getAllForWebSite = async (req, res) => {
  try {
    const faq = await Faq.find();

    if (faq.length === 0) {
      return res.status(200).json(response({ status: 'OK', statusCode: '200', type: 'faq', message: req.t('faq content not found') }));
    }

    //const faqContentWithoutTags = faq.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'faq', message: req.t('faq content retrieved successfully'), data: faq }));
  } catch (error) {
    logger.error(error, req.originalUrl)
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: req.t('Server Error') }));
  }
};

module.exports = { createFaq, getAll, deleteFaq, updateFaq, getFaqById, getAllForWebSite };