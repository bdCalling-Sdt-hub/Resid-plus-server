const Faq = require("../models/Faq");
const User = require("../models/User");
const response = require("../helpers/response");

const createFaq = async (req, res) => {
  const { question, answer } = req.body;

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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: 'You are not Authorization' }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findOne({ question: question, answer: answer });

    if (!faq) {
      // If no entry exists, create a new one
      faq = new Faq({ question, answer });
      await faq.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'faq', message: 'Faq added successfully.', data: faq }));
    }

    // If an entry exists, update its content
    else {
      return res.status(201).json(response({ status: 'Error', statusCode: '201', type: 'faq', message: 'Faq already exists', data: faq }));
    }
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: 'Server error' }));
  }
};

const updateFaq = async (req, res) => {
  try {
    const id = req.params.id;
    const { question, answer } = req.body;
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: 'You are not Authorization' }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findById(id);

    if (!faq) {
      // If no entry exists, create a new one
      faq = new Faq({ question, answer });
      await faq.save();
      return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'faq', message: 'No faq found' }));
    }

    faq.question = question;
    faq.answer = answer;
    await faq.save();
    return res.status(201).json(response({ status: 'Updated', statusCode: '201', type: 'faq', message: 'Faq updated successfully.', data: faq }));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: 'Server error' }));
  }
};

const deleteFaq = async (req, res) => {
  try {
    const id = req.params.id;
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: 'You are not Authorization' }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findById(id);

    if (!faq) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'faq', message: 'No faq found' }));
    }

    await Faq.findByIdAndDelete(id);
    return res.status(201).json(response({ status: 'deleted', statusCode: '201', type: 'faq', message: 'Faq deleted successfully.', data: faq }));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: 'Server error' }));
  }
};

const getFaqById = async (req, res) => {
  try {
    const id = req.params.id;
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'faq', message: 'You are not Authorization' }));
    }

    // Check if an faq entry already exists
    let faq = await Faq.findById(id);

    if (!faq) {
      return res.status(409).json(response({ status: 'Error', statusCode: '409', type: 'faq', message: 'No faq found' }));
    }
    return res.status(201).json(response({ status: 'OK', statusCode: '201', type: 'faq', message: 'Faq retrived successfully.', data: faq }));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: 'Server error' }));
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

    const faq = await Faq.find();

    if (faq.length === 0) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'faq', message: 'faq content not found' }));
    }

    //const faqContentWithoutTags = faq.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'faq', message: 'faq content retrieved successfully', data: faq }));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'faq', message: 'Server Error' }));
  }
};

module.exports = { createFaq, getAll, deleteFaq, updateFaq, getFaqById };