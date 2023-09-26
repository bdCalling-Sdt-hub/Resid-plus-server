const TermsAndCondition = require("../models/TermsAndCondition");
const User = require("../models/User");
const response = require("../helpers/response");

const createTermsAndCondition = async (req, res) => {
  try {
    const { content } = req.body;
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
      return res.status(401).json(response({ status: 'Error', statusCode: '401', type: 'terms-and-conditions', message: 'You are not Authorization' }));
    }

    // Check if an Terms and conditions entry already exists
    let termsAndCondition = await TermsAndCondition.findOne();

    if (!termsAndCondition) {
      // If no entry exists, create a new one
      termsAndCondition = new TermsAndCondition({ content });
      await termsAndCondition.save();
      return res.status(201).json(response({ status: 'Created', statusCode: '201', type: 'terms-and-conditions', message: 'Terms-and-conditions added successfully.', data: termsAndCondition }));
    }

    // If an entry exists, update its content
    termsAndCondition.content = content;
    await termsAndCondition.save();
    return res.status(201).json(response({ status: 'Edited', statusCode: '201', type: 'terms-and-conditions', message: 'Terms and conditions content updated successfully', data: termsAndCondition }));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'terms-and-conditions', message: 'Server error' }));
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

    const termsAndCondition = await TermsAndCondition.findOne();

    if (!termsAndCondition) {
      return res.status(404).json(response({ status: 'Error', statusCode: '404', type: 'terms-and-conditions', message: 'Terms and conditions content not found' }));
    }

    //const termsAndConditionContentWithoutTags = termsAndCondition.content.replace(/<\/?[^>]+(>|$)/g, "");
    return res.status(201).json(response({ status: 'Success', statusCode: '201', type: 'terms-and-conditions', message: 'Terms and conditions content retrieved successfully', data: termsAndCondition }));
  } catch (error) {
    console.error(error.message);
    return res.status(500).json(response({ status: 'Error', statusCode: '500', type: 'terms-and-conditions', message: 'Server Error' }));
  }
};

module.exports = { createTermsAndCondition, getAll };